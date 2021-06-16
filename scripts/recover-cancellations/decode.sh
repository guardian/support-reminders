#!/bin/bash
while IFS= read -r line; do
    echo `echo $line | base64 -d`
done < "$1"

