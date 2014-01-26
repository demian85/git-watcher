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
![Overview 1](http://screencloud.net/img/screenshots/7cebea458d52135e0e5dcdf871f88283.png)
![Overview 2](http://screencloud.net/img/screenshots/bad02238ed39de9f19ee1438fd94dc19.png)

## TODO

I'm working on the following features
(your help will be much appreciated!)

* Amend commit (Really hard to do without a proper API!)
* Allow to open repository using system's file browser
* Correctly show unmerged paths info. Alert when staging an unmerged file.
* Configuration options
* Menu bar with utility options: open gitk, browse, diff, etc.
* UI improvements: file type icons, render images in diff
* Shortcuts
* Git log

## Download

I'll try to keep this updated.

* [Linux x64 v0.2.1 (latest build)](https://www.dropbox.com/s/rj7w3n80jrf21fu/git-watcher-linux-x64-v0.2.1.tar.gz)
* [Linux x64 v0.1.0](https://www.dropbox.com/s/nzngdiwqw2yi2mi/git-watcher-v0.1.0.tar.gz)

## How to run the app

Extract file contents and just execute `./run.sh /path/to/repository`
See `config.json`file for more options.

## Quick start for developers

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
