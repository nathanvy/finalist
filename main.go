package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"github.com/gorilla/mux"
	"github.com/jackc/pgx/v5/pgxpool"
	"gopkg.in/ini.v1"
)

var pool *pgxpool.Pool

func authorize(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie("auth")
		if err != nil || cookie.Value == "" {
			jsonResponse(w, http.StatusUnauthorized, map[string]string{"error": "Unauthorized: bad session"})
			//http.Error(w, "Unauthorized: bad session", http.StatusUnauthorized)
			return
		}

		sessid := cookie.Value
		var accountID int
		err = pool.QueryRow(context.Background(), "select account from fnlst.sessions where sid = $1", sessid).Scan(&accountID)
		if err != nil {
			if err == sql.ErrNoRows {
				jsonResponse(w, http.StatusUnauthorized, map[string]string{"error": "Unauthorized: bad session"})
				//http.Error(w, "Unauthorized: bad session", http.StatusUnauthorized) //jsonresponse these
			} else {
				log.Println("Error querying the databse:", err)
				jsonResponse(w, http.StatusInternalServerError, map[string]string{"error": "Guru Meditation"})
				//http.Error(w, "Internal Server Error", http.StatusInternalServerError)
			}
			return
		}
		//session is valid, can proceed now
		ctx := context.WithValue(r.Context(), "accountID", accountID)
		w.Header().Set("X-Logged-In", "true") //so the front end can do conditional rendering
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func fservFallback(staticDir string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		path := filepath.Join(staticDir, r.URL.Path)
		if _, err := os.Stat(path); os.IsNotExist(err) {
			//file doesn't exist on disk, so serve index.html
			http.ServeFile(w, r, filepath.Join(staticDir, "index.html"))
			return
		}

		//otherwise serve static file
		http.FileServer(http.Dir(staticDir)).ServeHTTP(w, r)
	}
}

func initDBPool(uname string, pwd string, host string, dbname string) error {
	connString := "postgres://" + uname + ":" + pwd + "@" + host + ":5432/" + dbname
	var err error // don't shadow global var with :=
	pool, err = pgxpool.New(context.Background(), connString)
	if err != nil {
		return fmt.Errorf("unable to create connpool: %w", err)
	}

	if err = pool.Ping(context.Background()); err != nil {
		return fmt.Errorf("unable to ping db: %w", err)
	}

	return nil
}

func jsonResponse(w http.ResponseWriter, status int, data interface{}) {
	w.WriteHeader(status)
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(data); err != nil {
		log.Println("Error encoding JSON response:", err)
	}
}

func main() {
	cfg, err := ini.Load("conf.ini")
	if err != nil {
		log.Fatalf("Failed to load conf.ini! %v\n", err)
		return
	}

	port := cfg.Section("finalist").Key("port").String()
	dbname := cfg.Section("finalist").Key("dbname").String()
	dbpwd := cfg.Section("finalist").Key("dbpwd").String()
	dbuser := cfg.Section("finalist").Key("dbuser").String()
	dbhost := cfg.Section("finalist").Key("dbhost").String()

	if err = initDBPool(dbuser, dbpwd, dbhost, dbname); err != nil {
		log.Fatalf("Failed to init connpool: %v\n", err)
	}
	defer pool.Close()
	r := mux.NewRouter()

	staticDir := "./wwwroot"

	//public routes
	pub := r.PathPrefix("/pubapi").Subrouter()
	pub.HandleFunc("/login", loginHandler).Methods(http.MethodPost)
	pub.HandleFunc("/logout", logoutHandler).Methods(http.MethodGet)

	//authorized routes
	api := r.PathPrefix("/api").Subrouter()
	api.Use(authorize)
	api.HandleFunc("/about", aboutHandler).Methods(http.MethodGet)
	api.HandleFunc("/list/{id}/newitem", newListItemHandler).Methods(http.MethodPost)
	api.HandleFunc("/list/{id}/delete/{item}", listItemDeleteHandler).Methods(http.MethodGet)
	api.HandleFunc("/list/{id}/update/{item}", listItemUpdateHandler).Methods(http.MethodPost)
	api.HandleFunc("/newlist", newListHandler).Methods(http.MethodPost)
	api.HandleFunc("/deletelist/{id}", deleteListHandler).Methods(http.MethodGet)
	api.HandleFunc("/listview", listOverviewHandler).Methods(http.MethodGet)
	api.HandleFunc("/list/{id}", listviewHandler).Methods(http.MethodGet)
	api.HandleFunc("/listusers/{id}", listUsersHandler).Methods(http.MethodGet)
	api.HandleFunc("/list/{id}/setsharedusers", setSharedUsersHandler).Methods(http.MethodPost)

	//catchall
	r.PathPrefix("/").Handler(fservFallback(staticDir))

	http.Handle("/", r)
	log.Printf("starting finalist on port %s...\n", port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatalf("Shit is fucked: %v\n", err)
	}
}
