#zip all files to nw archive
zip -r gitw.nw ./* -x"build/*"

#copy necessary files from current node-webkit build
cp /opt/node-webkit/nw.pak ./nw.pak
cp /opt/node-webkit/icudtl.dat ./icudtl.dat

#create directory
mkdir ./build/gitw-linux-x64 -p

#compilation to executable form
cat /opt/node-webkit/nw ./gitw.nw > ./build/gitw-linux-x64/gitw && chmod +x ./build/gitw-linux-x64/gitw

#move necessary files to build folder
mv ./nw.pak ./build/gitw-linux-x64/nw.pak
mv ./icudtl.dat ./build/gitw-linux-x64/icudtl.dat

#remove app.nw
rm ./gitw.nw

#copy useful files
cp ./build-package.json ./build/gitw-linux-x64/package.json
cp ./icons/git-watcher.png ./build/gitw-linux-x64/icon.png
