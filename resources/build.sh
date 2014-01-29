#zip all files to nw archive
zip -r app.nw ./*
#copy nw.pak from current build node-webkit
cp /opt/node-webkit/nw.pak ./nw.pak
#create directory
mkdir ../build/linux -p
#compilation to executable form
cat /opt/node-webkit/nw ./app.nw > ../build/linux/app && chmod +x ../build/linux/app
#move nw.pak to build folder
mv ./nw.pak ../build/linux/nw.pak
#remove app.nw
rm ./app.nw
#copy useful files
cp ./build-package.json ../build/linux/package.json
