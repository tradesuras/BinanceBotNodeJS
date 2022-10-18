declare global {
    interface Number {
        round(places: number): number;
    }
    interface String {
      capitalize(): string;
    }
  }

  Number.prototype.round = function(places: number) {
    return this.toFixed(places).valueOf();
  }

  String.prototype.capitalize = function() {
      return this.charAt(0).toUpperCase() + this.slice(1);
  }
  
  export {}