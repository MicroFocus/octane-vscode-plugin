# Visual Studio Code for ALM Octane

With the ALM Octane Visual Studio Code plugin, you can do your ALM Octane work (on stories, defects, tasks, and so on) directly within the Visual Studio Code development framework.
## Dependencies

* node (tested with v14.17.0)
* npm (tested with 6.14.13)

## Steps to build and run

1. git checkout
2. `cd octane-vscode-plugin/`
3. `npm install`

## Testing and installing locally

* Inside the editor, press `F5` to compile and run the extension. This will run the extension in a new Extension Developement Host window.
* One can install the extension by issueing the following command in shell: `code --install-extension visual-studio-code-plugin-for-alm-octane-0.0.1.vsix` providing the path to the `.vsix` file.

## Publishing the extention

1 intall `vsce` ,short for "Visual Studio Code Extensions": `npm install -g vsce`
2 `cd octane-vscode-plugin/`
3 run command `vsce package`
4 run command `vsce publish`