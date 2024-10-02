include secrets.mk

build:
	echo "Compiling for Linux/amd64..."
	mkdir -p obj/
	GOOS=linux GOARCH=amd64 go build -o obj/fnlst-linux-amd64 
	echo "Complete!"

clean:
	rm -rf obj/
	rm -rf staging/
deploy:
	mkdir -p staging/wwwroot
	cp obj/fnlst-linux-amd64 staging/
	cp conf.ini staging/
	cp -R wwwroot/ staging/wwwroot
	rsync -a --delete staging/ $(URI)
