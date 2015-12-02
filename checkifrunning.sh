#!/bin/bash
pid=$(pidof node)
if [ -z "$pid" ]
then
    cd /home/admin/pccswarmies
    sudo service nginx start
    bin/www 2>&1 > /dev/null &
    echo -e "Server starting."
else
    echo -e "Server started already."
fi
