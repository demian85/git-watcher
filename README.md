## Introduction

Git Watcher is a multi-platform desktop app written in pure HTML and Javascript using node-webkit.

It shows diff information about local staged/unstaged files and allows you to commit changes. UI is updated in real-time by detecting file changes and git index changes. Submodules also inform changes to their parent module.

It also organizes repository submodules in tabs, so that you can work easily with them without the need of having multiple git gui instances or shells.

In my opinion, the native git gui app is awful and lacks a lot of features. This app aims to outstand it :)

## Features

* **Real-time** multiple file diff information with line numbers and **syntax highlighting**
* Allows you to work with **submodules organized in tabs**.
* Allows you to **open files** by clicking on its name or lines numbers.
* Shows current **branch information**: upstream branch and ahead/behind commit count.
* System Tray support

## Screenshots
![Overview 1](http://screencloud.net/img/screenshots/7532a5c724d8fba5d0f305106c2ff90d.png)
![Overview 2](http://screencloud.net/img/screenshots/8585ba99bd331e2942bdb40fcf1906c5.png)
![Overview 3](http://screencloud.net/img/screenshots/ce16abddd6740647bb4277fe483b1d74.png)

## TODO

I'm working on the following features
(your help will be much appreciated!)

* Amend commit (Really hard to do without a proper API!)
* Correctly show unmerged paths info. Alert when staging an unmerged file.
* Configuration options
* Utility options in menu bar: open gitk, browse, diff, etc.
* UI improvements: render images in diff, shortcuts, more file options, better syntax highlighting, etc
* Git log: show errors/warnings
* Improve speed for large repositories

## Download

I'll try to keep this updated.

* [Linux x64 v0.3.0 (latest build)](https://www.dropbox.com/s/8ij8kferfgmutls/git-watcher-linux-x64-v0.3.0.tar.gz)
* [Linux x64 v0.2.1](https://www.dropbox.com/s/rj7w3n80jrf21fu/git-watcher-linux-x64-v0.2.1.tar.gz)
* [Linux x64 v0.1.0](https://www.dropbox.com/s/nzngdiwqw2yi2mi/git-watcher-v0.1.0.tar.gz)

## How to run the app

Just extract file contents and execute `./run.sh`

## Or build it yourself!

Please read [node-webkit wiki](https://github.com/rogerwang/node-webkit/wiki) for details on how to run apps.

* Clone repo 
* Install node dependencies by executing `npm install` inside `resources/node_modules/git-watcher`.
* Install *nw-gyp*: `npm install -g nw-gyp`
* Rebuild *git-utils* and *mmmagic* dependencies based on the node-webkit version you are running. Eg: `nw-gyp rebuild --target=0.8.4`
* Download node-webkit and extract its contents in `/opt/node-webkit`
* Run the app! `/opt/node-webkit/nw /path/to/git-watcher/resources`

Also, in the resources folder, you will find a helper script `build.sh` that creates a Linux build. It asumes you have node-webkit installed on `/opt/node-webkit`.

## Troubleshooting

[The solution of lacking libudev.so.0](https://github.com/rogerwang/node-webkit/wiki/The-solution-of-lacking-libudev.so.0)
