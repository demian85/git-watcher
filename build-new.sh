#zip all files to nw archive
zip -r gitw.nw ./* -x"build/*"

#copy nw.pak from current build node-webkit
cp /opt/node-webkit/nw.pak ./nw.pak

#create directory
mkdir ./build/linux-x64-new -p

#compilation to executable form
cat /opt/node-webkit/nw ./gitw.nw > ./build/linux-x64-new/gitw && chmod +x ./build/linux-x64-new/gitw

#move nw.pak to build folder
mv ./nw.pak ./build/linux-x64-new/nw.pak

#remove app.nw
rm ./gitw.nw

#copy useful files
cp ./build-package.json ./build/linux-x64-new/package.json
cp ./icons/git-watcher.png ./build/linux-x64-new/icon.png

#libudev hack
sed -i 's/udev\.so\.0/udev.so.1/g' ./build/linux-x64-new/gitw
