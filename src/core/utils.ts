const roundTo = function(num: number, places: number) {
    const factor = 10 ** places;
    return Math.round(num * factor) / factor;
};

const printJSON = function(obj) {
    console.log(JSON.stringify(obj, null, 2));
}

const capitalize = function(word:string) {
    return word.charAt(0).toUpperCase() + word.slice(1);
};

const relDiff = function(numberA, numberB) {
    if(numberA + numberB === 0) { return 0; }
    return  100 * Math.abs( ( numberA - numberB ) / ( (numberA + numberB)/2 ) );
}

const isSymbolInArray = (textToSearch:string, addressesArray:any[]) => {
    let result = false;
    if (addressesArray.some(v => textToSearch.includes(v))) {
        result = true;
    }
    return result;
}

const dynamicSort = async(property) => {
    var sortOrder = 1;
    if(property[0] === "-") {
        sortOrder = -1;
        property = property.substr(1);
    }
    return function (a,b) {
        /* next line works with strings and numbers, 
         * and you may want to customize it to your needs
         */
        var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
        return result * sortOrder;
    }
}

const formatDate = (data:any[]) => {
    let result = new Array<any>();
    let dateType = new Date();
    let numberType:number = 0;
    data.forEach(element => {
        if (element.Timestamp instanceof Date) {
            element.Timestamp = element.Timestamp.toLocaleString();
        }
        if (element.timestamp instanceof Date) {
            element.timestamp = element.timestamp.toLocaleString();
        }
        result.push(element);
    });
    return result;
}

const getPercentageDifferenceBetweenCurrentPriceAndOrderPrice = (currentPrice:number, orderPrice:number) => {
    return Math.abs((currentPrice * 100 / orderPrice) - 100);
}


export { roundTo,
        printJSON, 
        relDiff, 
        dynamicSort, 
        isSymbolInArray, 
        capitalize, 
        formatDate, 
        getPercentageDifferenceBetweenCurrentPriceAndOrderPrice  
    }