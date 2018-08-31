#!/usr/bin/env node
'use strict';
/**
 * JSON-TO-SCSS Command Line Interface.
 * @author Renaud Lapoële
 */


/**
 * Module dependencies.
 */
const path                       = require('path');
const packageJson                = require(path.join(__dirname, '../package.json'));
const args                       = require('yargs').argv;
const chalk                      = require('chalk');
const glob                       = require('glob');
const pathBasename               = require('../lib/utils/path/basename');
const removePathExtension        = require('../lib/utils/path/removeExtension');
const jsJsonFilesToSassScssFiles = require('../lib/jsJsonFilesToSassScssFiles');


/**
 * @function banner
 * @param {string} name - the name of the package the banner is getting built for.
 * @param {string} version - the version number of the package the banner is getting built for.
 * @returns {string} this lib/package's name & version.
 * @description Returns a string containing the name and the version of this lib/package.
 */
function banner(name, version) {
  return `${chalk.bold(`${name || 'NO NAME'} v${version || '0.0.0'}`)}`;
}


/**
 * @function usage
 * @param {string} name - the name of the package usage instructions are generated for.
 * @returns {string} the lib/package's usage text.
 * @description Returns the usage description of this lib/package.
 */
function usage(name) {
  return `
    ${chalk.bold('Usage')}: ${chalk.yellow(name || 'NO NAME')} <source> [destination] [options]
    
           ${chalk.bold('source')}:           the path to a javascript, json or group of files to be converted.
           (required)        - only '.js' and '.json' are processed.
           
           ${chalk.bold('destination')}:      the full or partial destination of the converted files.
           (optional)        - when the destination is a directory path only, all generated
                               files are saved in it with a default '.scss' extension. If
                               a '.sass' extension is required instead, the --sass option must be included.
    
                       
           ${chalk.bold('options')}:
           
            --h              (help)           Show this message.
            --p='prefix'     (prefix)         Prepend the converted sass/scss content with the prefix.
                                              Prefix is usually used & set to be used as sass variable name.
                                              Default '\${source-filename} :'.
            --no-underscore  (no leading _)   Remove any leading '_' (underscore) characters from the
                                              prefix when used as sass variable name.
            --s='suffix'     (suffix)         Append the converted sass/scss content with the suffix.
                                              Default: ';' (default not used if --sass)
            --tt='tabText'   (tab text)       Text to be used to indent or tabulate sass map.
                                              Default: '  ' (two space characters)
            --tn=tabNumber   (tab number)     Number of tabulations.
                                              Default: 1 (set to 0 if --sass)
            --es='sq'||'dq'  (empty string)   Sass/scss representation for an empty string.
                                              Default is '""': { "prop": "" } => $xyzfilename: ( prop: "" );
            --sass           (sass ext.)      Use sass extension.

                                          
`;
}


/**
 * @function hasArgs
 * @param {object} args - command line arguments extracted via/from/with yargs.
 * @returns {boolean} true if args has an "_" property and if this property has a length property which is different than 0.
 * @description This is an internal small helper function to quickly assess if 'json-to-scss' is called without any params. Note that the code written here relies on the fact that we are using the 'yargs' package.
 */
function hasArgs(args) {
  return args._ && args._.length;
}


/**
 * @function extensionCorrector
 * @param {string} defaultExtension - the destination file extension to be used by default.
 * @param {string} requiredExtension - the destination file extension which must be used.
 * @returns {Function} a function to be used as input for an Array.map(fn) function call.
 * @description Internal helper function encapsulating the destination file extension transformations.
 */
function extensionCorrector(defaultExtension, requiredExtension) {
  return (filepath) => {
    const _extname = path.extname(filepath).toLowerCase();
    switch(_extname) {
    case '': return `${filepath}${'' !== requiredExtension ? requiredExtension : defaultExtension}`;
    case '.scss': return (('' === requiredExtension) || (requiredExtension === _extname)) ? filepath : `${removePathExtension(filepath, { mustValidateInput: false, recurse: false})}${requiredExtension}`;
    case '.sass': return (('' === requiredExtension) || (requiredExtension === _extname)) ? filepath : `${removePathExtension(filepath, { mustValidateInput: false, recurse: false})}${requiredExtension}`;
    default : return `${removePathExtension(filepath, { mustValidateInput: false, recurse: false})}${'' !== requiredExtension ? requiredExtension : defaultExtension}`;
    }
  };
}


/**
 * @function basenameExtractor
 * @param {string} filepath - the file path from which we want to extract the basename.
 * @returns {string} the file path basename.
 * @description Internal helper & wrapper function extracting the file path's base name.
 */
function basenameExtractor(filepath) {
  return pathBasename(filepath);
}


/**
 * @function dirnameSetup
 * @param {string} dirname - the directory name we want to use for our destination file paths.
 * @returns {function} a function to be used as input for an Array.map(fn) function call.
 * @description set the directory(ies) for the given destination file path.
 */
function dirnameSetup(dirname) {
  return (filepath) => path.resolve(path.join(dirname,filepath));
}


/**
 * @function normalizeArgs
 * @param {object} args - command line program arguments (built by the yargs package) to be normalized.
 * @returns {{source: {paths: *}, destination: {paths: (*|Array)}, options: {prefix: string | string, suffix: (*|string), emptyString: string, indentationText: (*|string), indentationSize: (*|number), noUnderscore: boolean, format: string}}}
 * @description check & normalize the command line program arguments.
 */
function normalizeArgs(args) {
  const _source = path.resolve(process.cwd(), `${args._[0]}`);
  const _sourcePaths = glob.sync(_source);
  const _defaultExtension = '.scss';
  const _requiredExtension = args.sass ? '.sass' : '';
  
  let _destination = args._.length > 1 ? removePathExtension(path.resolve(process.cwd(), args._[1])) : '';
  let _destinationPaths = [];
  if('' === _destination) {
    _destinationPaths = _sourcePaths.map(extensionCorrector(_defaultExtension, _requiredExtension));
  }
  else {
    _destinationPaths =
      _sourcePaths
        .map(basenameExtractor)
        .map(extensionCorrector(_defaultExtension, _requiredExtension))
        .map(dirnameSetup(_destination));
  }
  
  
  return {
    source: {
      paths: _sourcePaths
    },
    destination: {
      paths: _destinationPaths,
    },
    options: {
      prefix: args.p || '',
      suffix: args.s || ';',
      emptyString: args.es && ('sq' === args.es)? "''" : '""',
      indentationText: args.tt || '  ',
      indentationSize: args.tn || 1,
      noUnderscore: args.underscore === false,
      format: args.sass ? '.sass': '.scss'
    }
  };
}


/**
 * The 'json-to-scss' main function in charge of parsing arguments and, if possible,
 * executing the file conversion.
 */
function main() {
  console.log(banner(packageJson.name, packageJson.version));
  if (hasArgs(args)) {
    
    if (args.h || args.help) {
      console.log(usage(packageJson.name));
    }
    else {
      const _nargs = normalizeArgs(args);
      if (_nargs.source.paths.length) {
        jsJsonFilesToSassScssFiles(_nargs.source.paths, _nargs.destination.paths, { options: _nargs.options, mustValidateInput: false });
      }
      else {
        console.log(`Hmmm strange... ${chalk.red(args._[0])} does not seem to exist. Mind checking it?`);
      }
    }
  }
  else {
    console.log(usage(packageJson.name));
  }
}


/**
 * Execute the main module function.
 */
main();

