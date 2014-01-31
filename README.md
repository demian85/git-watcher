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
![Overview 1](http://screencloud.net/img/screenshots/d10102d44ddc040b2adb891b0ffdbffd.png)
![Overview 2](http://screencloud.net/img/screenshots/91176b2babb1b4df89a6b3ca0347a620.png)
![Overview 3](http://screencloud.net/img/screenshots/5b081d51fd0e1bef058ce68e73a832db.png)

## TODO

I'm working on the following features
(your help will be much appreciated!)

* Amend commit (Really hard to do without a proper API!)
* Correctly show unmerged paths info. Alert when staging an unmerged file.
* Configuration options
* Utility options in menu bar: browse, diff, etc.
* UI improvements: render images in diff, shortcuts, more file options, better syntax highlighting, etc
* Git log: show errors/warnings
* Improve speed for large repositories

## Download

For distributions __older__ than *Ubuntu 13.04*, *Fedora 18/19* or derivative, please download the __*Old dist*__ build.

Go for the __*New dist*__ if you have any of the distributions mentioned above or __newer__.

* [Linux x64 - Old dist - v0.3.2](https://mega.co.nz/#!6RJzlTrL!1f7TkRzAuDK6KAQy3fpYFzGUqz5yqgfESj_BB2-NjQY) - Ubuntu 12.04 or 12.10
* [Linux x64 - New dist - v0.3.2](https://mega.co.nz/#!zQhjSBZT!Mxz8HoeCqcTdGIMcsMA27dA3epMxZ7pQMYLuxLdBxCM) - Ubuntu 13.04+, Gentoo, Arch, Fedora 18+

## How to run the app

Just extract file contents and execute `./app`.

You can also `npm link`. A link to the app will be added in `/usr/local/bin`, so you can run the app using `gitw` command.

If it's a valid Git repository, the current working directory is used by default.

## Or build it yourself!

Please read [node-webkit wiki](https://github.com/rogerwang/node-webkit/wiki) for details on how to run apps.

[NodeJS](http://nodejs.org/download/) >= 0.10 is required

* [Download node-webkit](https://github.com/rogerwang/node-webkit#downloads) and extract its contents in `/opt/node-webkit`
* Clone repo 
* `cd ./resources`
* `npm install`
* Install *nw-gyp*: `npm install -g nw-gyp`
* Rebuild *git-utils* and *mmmagic* dependencies based on the node-webkit version you are running. Eg: `cd node_modules/git-utils && nw-gyp rebuild --target=0.8.4`:
* Run the app! `/opt/node-webkit/nw /path/to/git-watcher/resources`

Also, in the resources folder, you will find a helper script `build.sh` that creates a Linux build. It asumes you have node-webkit installed on `/opt/node-webkit`.

## Troubleshooting

* [The solution of lacking libudev.so.0](https://github.com/rogerwang/node-webkit/wiki/The-solution-of-lacking-libudev.so.0)
* __ENOSPC error__: You may run into that error when browsing large repositories. You need to increase the maximum number of watches for inotify: `echo fs.inotify.max_user_watches=65536 | sudo tee -a /etc/sysctl.conf && sudo sysctl -p`. That should be enough.
