Here we install nginx on a Termux Android device 
to share our files 

```
pkg install jq
```

```
nano $PREFIX/etc/nginx/nginx.conf
```

```
location / {
    #root   /data/data/com.termux/files/usr/share/nginx/html;
    #index  index.html index.htm;

    root /storage/emulated/0/;
    autoindex   on;
    autoindex_exact_size off;
    autoindex_localtime on;
    charset utf-8;
}
```

```
nano send_notify.sh
```