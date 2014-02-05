#zip all files to nw archive
zip -r gitw.nw ./* -x"build/*"

#copy nw.pak from current build node-webkit
cp /opt/node-webkit/nw.pak ./nw.pak

#create directory
mkdir ./build/linux -p

#compilation to executable form
cat /opt/node-webkit/nw ./gitw.nw > ./build/linux/gitw && chmod +x ./build/linux/gitw

#move nw.pak to build folder
mv ./nw.pak ./build/linux/nw.pak

#remove app.nw
rm ./gitw.nw

#copy useful files
cp ./build-package.json ./build/linux/package.json
cp ./icons/git-watcher.png ./build/linux/icon.png
