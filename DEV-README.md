# Visual Studio Code for Core Software Delivery Platform 

## Dependencies 

 * node (tested with v18.15.0) 

* npm (tested with 9.5.0) 

  

## Steps to build and run 

 1. git checkout 

2. `cd octane-vscode-plugin/` 

3. `npm install` 

  

## Testing and installing locally 

 * Inside the editor, press `F5` to compile and run the extension. This will run the extension in a new Extension Developement Host window. 

* One can install the extension by issueing the following command in shell: `code --install-extension visual-studio-code-plugin-for-alm-octane-0.0.1.vsix` providing the path to the `.vsix` file. 

  

## Publishing and packaging the extention 

 1. intall `vsce` ,short for "Visual Studio Code Extensions": `npm install -g vsce` 

2. `cd octane-vscode-plugin/` 

3. run command `vsce package` if you want to package and test the extension on your local install of VS Code. 

4. run command `vsce publish` if you want to publish the extension. 