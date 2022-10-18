var fs = require("fs");
const ansi = require ('ansicolor') // that comes with ololog
const dir = './logs';

//** Check if exists logs dir */
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir);
}

const log = require ('ololog').configure ({

    /*  Injects a function after the "render" step            */
    
        'render+' (text, { consoleMethod = '' }) {
    
            if (text) {
    
                const strippedText = ansi.strip (text).trim () + '\n' // remove ANSI codes                

                //* Get a formatted date
                let current_datetime = new Date();
                let month = (current_datetime.getMonth() + 1) < 9 ? 
                    "0" + (current_datetime.getMonth() + 1) : 
                    (current_datetime.getMonth() + 1);
                let date = current_datetime.getDate() < 9 ? 
                    "0" + current_datetime.getDate() : 
                    current_datetime.getDate();
                let formatted_date = current_datetime.getFullYear() + "-" + month + "-" + date;
    
            /*  Writes to the file only if .info or .error or .warn has been specified.  */
    
                if (consoleMethod) {                  
                    fs.appendFileSync (dir + "/" + formatted_date + '-info.log', strippedText);
    
                /*  Writes .error and .warn calls to a separate file   */
    
                    if ((consoleMethod === 'error') || (consoleMethod === 'warn')) {  
                        fs.appendFileSync (dir + "/" + 'error.log', strippedText)
                    }
                }
            }
    
            return text
        }
 })





module.exports.log = log;