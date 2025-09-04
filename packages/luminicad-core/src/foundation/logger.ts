export class Logger {
    static debug(message?: any, ...optionalParams: any[]) {
        console.log(message, ...optionalParams);
    }

    static info(message?: any, ...optionalParams: any[]) {
        console.log(message, ...optionalParams);
    }

    static warn(message?: any, ...optionalParams: any[]) {
        console.warn(message, ...optionalParams);
    }

    static error(message?: any, ...optionalParams: any[]) {
        console.error(message, ...optionalParams);
    }
}

// facilitate debugging
Logger.info = console.log;
Logger.warn = console.warn;
Logger.debug = console.log;
Logger.error = console.error;
