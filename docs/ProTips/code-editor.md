## Run multi-line script
Press <kbd>Ctrl</kbd>+<kbd>Enter</kbd>, or click the "Run" button.

## Sidenotes on autocompletion
1. **Type hint annotation**  
   ```md
   //<T>
   ```
   E.g. `''.│//<''>`, `[].│//<[]>`, ect. (`│` repr a caret)
2. **Alphabetic completion**  
   For example, to get `document.getElementById`, you can of course enter `document.id`, but in addition, entering `document.gid` and `document.gId` will have a very different effect – only the latter will bring up the completion, and this is something the developer (me) stumbled upon rather than by design.

## Special marks
- if (code.endsWith(...)):
  - ... = `//.`: Do not output the return value
  - ... = `//..`: Force output return value (To override the default behavior of not returning the value of the entire program if the program contains `_console.log`)
  - ... = `//.JSON`: `JSON.stringify` the return value

## Exposed ad hoc functions
1. Database: `getItem`, `setItem`, `delItem`, `clearDB`
2. `$load( scriptsURLs )`: `scriptsURLs` can be a string or tuple or array.  
   E.g. load some well-known frameworks:
   - VS Code (Monaco Editor):
     - `$load.presets.VSCode()`
     - `$VSCode()`
     - `$VSCode(lang='julia')`
   - TensorFlow.js: `$load('@tensorflow/tfjs')`
3. Other
   - `$str`: `JSON.stringify` indented with two spaces
   - `$clear`: Clear outputs

## Custom tasks
- `setItem('custom:run-after-loading', 'alert("Hi")')`