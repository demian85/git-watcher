## Introduction

Git Watcher is a desktop app written in pure HTML and Javascript using node-webkit.

It shows diff information about local staged/unstaged files in real-time and allows you to commit changes. Basically, it works like the native git gui.

It also organizes repository submodules in tabs, so that you can work easily with them without the need of having multiple git gui instances or shells.

It still lacks a few features, please help me improve it!

## Features

* Real-time multiple file diff information with line numbers.
* Allows you to work with submodules organized in tabs.
* Allows you to open files by clicking on its name or line number.
* Shows current branch information: upstream branch and ahead/behind commit count.

## TODO 

I'm working on the following features
(your help will be much appreciated!)

* Amend commit (help I don't know how to do it without a proper API)
* Allow to open repository using system's file browser
* Use cwd as the default repository
* Configuration options
* Option to revert changes
* Show file type icon
* Git log
* UI improvements

## Download

I'll try to keep this updated.

[Linux 64bit v0.0.1](https://www.dropbox.com/s/vcvbd18zjnz180q/git-watcher-linux-x64.tar.gz)

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
