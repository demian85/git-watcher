## Introduction

Git Watcher is a desktop app written in pure HTML and Javascript using node-webkit.
It shows diff information about local staged/unstaged files in real-time and allows you to commit changes.
It also organizes repository submodules in tabs, so that you can work easily with them without the need of having multiple git gui instances or shells.
Basically, it works like the native git gui.

It still lacks a few features, please help me improve it!

[node-webkit](https://github.com/rogerwang/node-webkit)

[git-utils](https://github.com/atom/git-utils)

## Features

* Real-time multiple file diff information with line numbers.
* Allows you to work with submodules organized in tabs.
* Allows you to open files by clicking on its name of line number.
* Shows current branch information: upstream branch and ahead/behind commit count.

## Download Linux build

Coming soon...
[Linux 64bit]()

### How to use

Extract file contents and just execute `./run.sh /path/to/repository`
See `config.json`file for more options.

## TODO 

I'mk working on the following features
(your help will be much appreciated!)

* Amend commit: I don't even know how to do it!
* Allow to open repository using system's file browser
* Use cwd as the default repository
* Configuration options
* Option to revert changes
* Show file type nice icon and context menu with options
* Git log
* UI improvements

## Quick Start for developers

Please read [node-webkit wiki](https://github.com/rogerwang/node-webkit/wiki) for details on how to run apps.
Clone repo and make sure to install node dependencies by executing `npm install` inside `resources/node_modules/git_watcher`
Also, in the resources folder, you will find a helper script `build.sh` that creates a Linux build.
It asumes you have node-webkit installed on `/opt/node-webkit`.

## Troubleshooting

[The solution of lacking libudev.so.0](https://github.com/rogerwang/node-webkit/wiki/The-solution-of-lacking-libudev.so.0)