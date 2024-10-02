package main

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/mux"
	"golang.org/x/crypto/bcrypt"
)

// authenticated endpoints
func deleteListHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	ListID := vars["id"]

	accountID := r.Context().Value("accountID").(int)

	var count int
	sql := "select count(*) from fnlst.permissions where list_id = $1 and user_id = $2"
	err := pool.QueryRow(context.Background(), sql, ListID, accountID).Scan(&count)
	if err != nil {
		log.Println("Database error:", err)
		jsonResponse(w, http.StatusInternalServerError, map[string]string{"error": "Internal Server Error"})
		return
	}
	if count < 1 {
		//ain't nobody got permission for dat
		jsonResponse(w, http.StatusUnauthorized, map[string]string{"error": "Unauthorized"})
		return
	}

	othersql := "delete from fnlst.lists where id = $1"
	_, err = pool.Exec(context.Background(), othersql, ListID)
	if err != nil {
		log.Println("Database error:", err)
		jsonResponse(w, http.StatusInternalServerError, map[string]string{"error": "Internal Server Error"})
		return
	}

	contentsSql := "delete from fnlst.contentlist where listnumber = $1"
	_, err = pool.Exec(context.Background(), contentsSql, ListID)
	if err != nil {
		log.Println("Database error:", err)
		jsonResponse(w, http.StatusInternalServerError, map[string]string{"error": "Internal Server Error"})
		return
	}

	jsonResponse(w, http.StatusOK, map[string]string{"success": "List successfully deleted."})
}

func newListItemHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	ListID := vars["id"]

	var pld GenericPayload
	decoder := json.NewDecoder(r.Body)
	err := decoder.Decode(&pld)
	if err != nil {
		jsonResponse(w, http.StatusBadRequest, map[string]string{"error": "Bad Request"})
		return
	}

	accountID := r.Context().Value("accountID").(int)

	var count int
	sql := "select count(*) from fnlst.permissions where list_id = $1 and user_id = $2"
	err = pool.QueryRow(context.Background(), sql, ListID, accountID).Scan(&count)
	if err != nil {
		log.Println("Database error:", err)
		jsonResponse(w, http.StatusInternalServerError, map[string]string{"error": "Internal Server Error"})
		return
	}
	if count < 1 {
		//ain't nobody got permission for dat
		jsonResponse(w, http.StatusUnauthorized, map[string]string{"error": "Unauthorized"})
		return
	}

	othersql := "insert into fnlst.contentlist (content, listnumber) values ($1, $2) returning index"
	var idx int
	err = pool.QueryRow(context.Background(), othersql, pld.Payload, ListID).Scan(&idx)
	if err != nil {
		log.Println("Database error:", err)
		jsonResponse(w, http.StatusInternalServerError, map[string]string{"error": "Internal Server Error"})
		return
	}

	jsonResponse(w, http.StatusOK, map[string]int{"result": idx})
}

func listItemDeleteHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	ListID := vars["id"]
	ItemID := vars["item"]

	accountID := r.Context().Value("accountID").(int)

	var count int
	sql := "select count(*) from fnlst.permissions where list_id = $1 and user_id = $2"
	err := pool.QueryRow(context.Background(), sql, ListID, accountID).Scan(&count)
	if err != nil {
		log.Println("Database error:", err)
		jsonResponse(w, http.StatusInternalServerError, map[string]string{"error": "Internal Server Error"})
		return
	}
	if count < 1 {
		//ain't nobody got permission for dat
		jsonResponse(w, http.StatusUnauthorized, map[string]string{"error": "Unauthorized"})
		return
	}

	othersql := "delete from fnlst.contentlist where index = $1"
	_, err = pool.Exec(context.Background(), othersql, ItemID)
	if err != nil {
		log.Println("Database error:", err)
		jsonResponse(w, http.StatusInternalServerError, map[string]string{"error": "Internal Server Error"})
		return
	}

	jsonResponse(w, http.StatusOK, map[string]string{"success": "Item successfully deleted."})
}

func listItemUpdateHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	ListID := vars["id"]
	ItemID := vars["item"]

	accountID := r.Context().Value("accountID").(int)

	var pld IndexStringTuple
	decoder := json.NewDecoder(r.Body)
	err := decoder.Decode(&pld)
	if err != nil {
		jsonResponse(w, http.StatusBadRequest, map[string]string{"error": "Bad Request"})
		return
	}

	var count int
	sql := "select count(*) from fnlst.permissions where list_id = $1 and user_id = $2"
	err = pool.QueryRow(context.Background(), sql, ListID, accountID).Scan(&count)
	if err != nil {
		log.Println("Database error:", err)
		jsonResponse(w, http.StatusInternalServerError, map[string]string{"error": "Internal Server Error"})
		return
	}
	if count < 1 {
		//ain't nobody got permission for dat
		jsonResponse(w, http.StatusUnauthorized, map[string]string{"error": "Unauthorized"})
		return
	}

	othersql := "update fnlst.contentlist set content = $1 where index = $2"
	_, err = pool.Exec(context.Background(), othersql, pld.Payload, ItemID)
	if err != nil {
		log.Println("Database error:", err)
		jsonResponse(w, http.StatusInternalServerError, map[string]string{"error": "Internal Server Error"})
		return
	}

	jsonResponse(w, http.StatusOK, map[string]string{"newcontents": pld.Payload})
}

func newListHandler(w http.ResponseWriter, r *http.Request) {
	var pld GenericPayload
	decoder := json.NewDecoder(r.Body)
	err := decoder.Decode(&pld)
	if err != nil {
		jsonResponse(w, http.StatusBadRequest, map[string]string{"error": "Bad Request"})
		return
	}

	accountID := r.Context().Value("accountID").(int)
	var idx int
	sql := "insert into fnlst.lists (listname, owner) values ($1, $2) returning id"
	err = pool.QueryRow(context.Background(), sql, pld.Payload, accountID).Scan(&idx)
	if err != nil {
		log.Println("Database error:", err)
		jsonResponse(w, http.StatusInternalServerError, map[string]string{"error": "Internal Server Error"})
		return
	}

	otherSQL := "insert into fnlst.permissions (list_id, user_id, perm) values ($1, $2, 1)"
	_, err = pool.Exec(context.Background(), otherSQL, idx, accountID)
	if err != nil {
		log.Println("Database error:", err)
		jsonResponse(w, http.StatusInternalServerError, map[string]string{"error": "Internal Server Error"})
		return
	}

	jsonResponse(w, http.StatusOK, map[string]int{"result": idx})
}

func listviewHandler(w http.ResponseWriter, r *http.Request) {
	accountID := r.Context().Value("accountID").(int)
	vars := mux.Vars(r)
	listID := vars["id"]
	var count int
	sql := "select count(*) from fnlst.permissions where list_id = $1 and user_id = $2"
	err := pool.QueryRow(context.Background(), sql, listID, accountID).Scan(&count)
	if err != nil {
		log.Println("Database error:", err)
		jsonResponse(w, http.StatusInternalServerError, map[string]string{"error": "Internal Server Error"})
		return
	}
	if count < 1 {
		//ain't nobody got permission for dat
		jsonResponse(w, http.StatusUnauthorized, map[string]string{"error": "Unauthorized"})
		return
	}

	rows, err := pool.Query(context.Background(), "select index, content from fnlst.contentlist where listnumber = $1", listID)
	if err != nil {
		jsonResponse(w, http.StatusInternalServerError, map[string]string{"error": "Internal Server Error"})
		log.Println("Error querying the database:", err)
		return
	}
	defer rows.Close()

	var items []ListItem
	for rows.Next() {
		var item ListItem
		if err := rows.Scan(&item.ItemID, &item.Content); err != nil {
			log.Println("Error scanning row:", err)
			jsonResponse(w, http.StatusInternalServerError, map[string]string{"error": "Internal Server Error"})
			return
		}

		items = append(items, item)
	}

	if rows.Err() != nil {
		log.Println("Error iterating over rows:", rows.Err())
		jsonResponse(w, http.StatusInternalServerError, map[string]string{"error": "Internal server error"})
		return
	}

	jsonResponse(w, http.StatusOK, items)
}

func listOverviewHandler(w http.ResponseWriter, r *http.Request) {
	accountID := r.Context().Value("accountID").(int)
	sql := "with oklists as (select list_id from fnlst.permissions where user_id = $1) select id, listname from fnlst.lists where id in (select list_id from oklists)"
	rows, err := pool.Query(context.Background(), sql, accountID)
	if err != nil {
		jsonResponse(w, http.StatusInternalServerError, map[string]string{"error": "Internal Server Error"})
		log.Println("Error querying the database:", err)
		return
	}
	defer rows.Close()

	var lists []ListViewRow
	for rows.Next() {
		var item ListViewRow
		if err := rows.Scan(&item.ListID, &item.Name); err != nil {
			log.Println("Error scanning row:", err)
			jsonResponse(w, http.StatusInternalServerError, map[string]string{"error": "Internal Server Error"})
			return
		}

		lists = append(lists, item)
	}

	if rows.Err() != nil {
		log.Println("Error iterating over rows:", rows.Err())
		jsonResponse(w, http.StatusInternalServerError, map[string]string{"error": "Internal server error"})
		return
	}

	jsonResponse(w, http.StatusOK, lists)
}

func aboutHandler(w http.ResponseWriter, r *http.Request) {
	var pld GenericPayload
	pld.Payload = "v1.0"

	jsonResponse(w, http.StatusOK, pld)
}

func setSharedUsersHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	listID := vars["id"]

	accountID := r.Context().Value("accountID").(int)

	var data []IntBoolTuple
	if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
		log.Println("Invalid JSON body: ", err)
		jsonResponse(w, http.StatusInternalServerError, map[string]string{"error": "Invalid JSON body"})
		return
	}

	deletion := "delete from fnlst.permissions where list_id = $1"
	_, err := pool.Exec(context.Background(), deletion, listID)
	if err != nil {
		log.Println("Error deleting perms: ", err)
		return
	}

	insertion := "insert into fnlst.permissions (list_id, user_id, perm) values ($1, $2, 1)"
	for _, item := range data {
		if item.Value || item.Key == accountID {
			_, err = pool.Exec(context.Background(), insertion, listID, item.Key)
			if err != nil {
				log.Println("Error creating permissions:", err)
				jsonResponse(w, http.StatusInternalServerError, map[string]string{"error": "Internal Server Error"})
				return
			}
		}
	}

	jsonResponse(w, http.StatusOK, map[string]string{"success": "Settings saved successfully!"})
}

// select user_id from fnlst.users where list_id = id
// then, those users should be sent "checked" to the form
// instead of index-string tuples, use a payload that's got username, checked/unchecked
// and send that as the array to the frontend
func listUsersHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	listID := vars["id"]
	sql := "select u.index, u.username, case when p.user_id is not null then true else false end as shared from fnlst.users u left join fnlst.permissions p on u.index = p.user_id and list_id = $1"
	rows, err := pool.Query(context.Background(), sql, listID)
	if err != nil {
		log.Println("Error fetching users: ", err)
		jsonResponse(w, http.StatusInternalServerError, map[string]string{"error": "Internal Server Error"})
		return
	}
	defer rows.Close()

	var users []IndexStringBoolTriple
	for rows.Next() {
		var item IndexStringBoolTriple
		if err := rows.Scan(&item.Index, &item.Username, &item.Shared); err != nil {
			log.Default().Println("Error scanning row: ", err)
			jsonResponse(w, http.StatusInternalServerError, map[string]string{"error": "Internal Server Error"})
			return
		}
		users = append(users, item)
	}

	if rows.Err() != nil {
		log.Println("Error iterating over rows: ", rows.Err())
		jsonResponse(w, http.StatusInternalServerError, map[string]string{"error": "Internal Server Error"})
		return
	}

	jsonResponse(w, http.StatusOK, users)
}

// public endpoints
func loginHandler(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	decoder := json.NewDecoder(r.Body)
	err := decoder.Decode(&req)
	if err != nil {
		jsonResponse(w, http.StatusBadRequest, map[string]string{"error": "Bad Request"})
		return
	}

	var accountID int
	var pwhash string
	err = pool.QueryRow(context.Background(), "select index, pwhash from fnlst.users where username = $1", req.Username).Scan(&accountID, &pwhash)
	if err != nil {
		if err == sql.ErrNoRows {
			//user not found
			jsonResponse(w, http.StatusUnauthorized, map[string]string{"error": "Invalid username or password"})
		} else {
			log.Println("Error querying the database:", err)
			jsonResponse(w, http.StatusInternalServerError, map[string]string{"error": "Internal server error"})
		}
		return
	}

	err = bcrypt.CompareHashAndPassword([]byte(pwhash), []byte(req.Password))
	if err != nil {
		jsonResponse(w, http.StatusUnauthorized, map[string]string{"error": "Invalid username or password"})
		return
	}

	//make new sessid
	sessionbytes := make([]byte, 32)
	_, err = rand.Read(sessionbytes)
	if err != nil {
		log.Println("error: ", err)
		return
	}
	sessid := base64.StdEncoding.EncodeToString(sessionbytes)
	_, err = pool.Exec(context.Background(), "insert into fnlst.sessions (sid, account) values ($1, $2)", sessid, accountID)
	if err != nil {
		log.Println("Error creating session:", err)
		jsonResponse(w, http.StatusInternalServerError, map[string]string{"error": "Internal Server Error"})
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "auth",
		Value:    sessid,
		Path:     "/",
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteStrictMode,
	})

	jsonResponse(w, http.StatusOK, map[string]string{"success": ":Logged in successfully"})

}

func logoutHandler(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("auth")
	if err == nil && cookie.Value != "" {
		_, err = pool.Exec(context.Background(), "delete from fnlst.sessions where sid = $1", cookie.Value)
		if err != nil {
			log.Println("Error deleting session: ", err)
		}

		http.SetCookie(w, &http.Cookie{
			Name:     "auth",
			Value:    "",
			Path:     "/",
			HttpOnly: true,
			Secure:   true,
			SameSite: http.SameSiteStrictMode,
			Expires:  time.Unix(0, 0),
		})
	}

	//
	// data := map[string]string{"success": "Logged out successfully"}
	// w.WriteHeader(http.StatusOK)
	// w.Header().Set("Content-Type", "application/json")
	// if err := json.NewEncoder(w).Encode(data); err != nil {
	// 	log.Println("Error encoding JSON response:", err)
	// }

	jsonResponse(w, http.StatusOK, map[string]string{"success": "Logged out successfully"})
}
