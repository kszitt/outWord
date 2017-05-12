//
// officegen: basic common code
//
// Please refer to README.md for this module's documentations.
//
// NOTE:
// - Before changing this code please refer to the hacking the code section on README.md.
//
// Copyright (c) 2013 Ziv Barber;
//
// Permission is hereby granted, free of charge, to any person obtaining
// a copy of this software and associated documentation files (the
// 'Software'), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so, subject to
// the following conditions:
//
// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
// IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
// CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
// TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
// SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//

require("setimmediate"); // To be compatible with all versions of node.js

(function () {

    var sys = require('util');
    var events = require('events');

    var Transform = require('stream').Transform || require('readable-stream/transform');

// Used by generate:
    var archiver = require('archiver');
    var fs = require('fs');
    var PassThrough = require('stream').PassThrough || require('readable-stream/passthrough');

// Global data shared by all the officegen objects:

    var officegenGlobals = {}; // Our internal global objects.

    officegenGlobals.settings = {};
    officegenGlobals.types = {};
    officegenGlobals.docPrototypes = {};
    officegenGlobals.resParserTypes = {};

    /**
     * The constructor of the office generator object.
     * <br /><br />
     * This constructor function is been called by makegen().
     *
     * <h3><b>The options:</b></h3>
     *
     * The configuration options effecting the operation of the officegen object. Some of them can be only been
     * declared on the 'options' object passed to the constructor object and the rest can be configured by either
     * a property with the same name or by special function.
     *
     * <h3><b>List of options:</b></h3>
     *
     * <ul>
     * <li>'type' - the type of generator to create. Possible options: either 'pptx', 'docx' or 'xlsx'.</li>
     * <li>'creator' - the name of the document's author. The default is 'officegen'.</li>
     * <li>'onend' - callback that been fired after finishing to create the zip stream.</li>
     * <li>'onerr' - callback that been fired on error.</li>
     * </ul>
     *
     * @param {object} options List of configuration options (see in the description of this function).
     * @constructor
     * @name officegen
     */
    var officegen = function (options) {
        if (false === ( this instanceof officegen )) {
            return new officegen(options);
        } // Endif.

        events.EventEmitter.call(this);
        // Transform.call ( this, { objectMode : true } );

        // Internal events for plugins - NOT for the user:
        // event 'beforeGen'
        // event 'afterGen'
        // event 'clearDoc'

        var genobj = this;    // Can be accessed by all the functions been declared inside the officegen object.

        /**
         * For all the private data of each officegen instance that we don't want the user of officegen to access it.
         * Each officegen object has it's own copy of the private object so changes been done to the private object of one officegen document will not effect other objects.
         * <br /><br />
         * List of data members:
         * <ul>
         * <li>features (object) - ???.</li>
         * <ul>
         * <li>type</li>
         * <li>outputType (string) - The type of the container to hold all the resources.</li>
         * </ul>
         * <li>pages</li>
         * <li>resources</li>
         * <li>type</li>
         * <li>plugs</li>
         * <li>length</li>
         * </ul>
         * @namespace officegen#private
         */
        var privateData = {};

        // Features been configured by the type selector and you can't change them:
        privateData.features = {};
        privateData.features.type = {};
        privateData.features.outputType = 'zip';
        // privateData.features.page_name

        // Resources and "pages" of the document:
        privateData.pages = []; // Information about all the pages to create.
        privateData.resources = []; // List of all the resources to create inside the zip.

        // Extra data needed by the document and it's specific to either to "document prototype" (like MS-office) or a document type (like pptx):
        privateData.type = {};

        /**
         * Combine the given options and the default values.
         * <br /><br />
         *
         * This function creating the real options object.
         *
         * @param {object} options The options to configure.
         */
        function setOptions(object, source) {
            object = object || {};

            var objectTypes = {
                'boolean': false,
                'function': true,
                'object': true,
                'number': false,
                'string': false,
                'undefined': false
            };

            function isObject(value) {
                return !!(value && objectTypes[typeof value]);
            }

            function keys(object) {
                if (!isObject(object)) {
                    return [];
                }

                return Object.keys(object);
            }

            var index;
            var iterable = object;
            var result = iterable;

            var args = arguments;
            var argsIndex = 0;
            var argsLength = args.length;

            //loop variables
            var ownIndex = -1;
            var ownProps = objectTypes[typeof iterable] && keys(iterable);
            var length = ownProps ? ownProps.length : 0;

            while (++argsIndex < argsLength) {
                iterable = args[argsIndex];

                if (iterable && objectTypes[typeof iterable]) {

                    while (++ownIndex < length) {
                        index = ownProps[ownIndex];

                        if (typeof result[index] === 'undefined' || result[index] === null) {
                            result[index] = iterable[index];

                        } else if (isObject(result[index]) && isObject(iterable[index])) {
                            result[index] = setOptions(result[index], iterable[index]);
                        } // Endif.
                    } // End of while loop.
                } // Endif.
            } // End of while loop.

            return result;
        }

        /**
         * Configure this object to generate the given type of document.
         * <br /><br />
         *
         * Called by the document constructor to configure the new document object to the given type.
         *
         * @param {string} new_type The type of document to create.
         */
        function setGeneratorType(new_type) {
            privateData.length = 0;
            var is_ok = false;

            if (new_type) {
                for (var cur_type in officegenGlobals.types) {
                    if ((cur_type == new_type) && officegenGlobals.types[cur_type] && officegenGlobals.types[cur_type].createFunc) {
                        officegenGlobals.types[cur_type].createFunc(genobj, new_type, genobj.options, privateData, officegenGlobals.types[cur_type]);
                        is_ok = true;
                        break;
                    } // Endif.
                } // End of for loop.

                if (!is_ok) {
                    // console.error ( '\nFATAL ERROR: Either unknown or unsupported file type - %s\n', options.type );
                    genobj.emit('error', 'FATAL ERROR: Invalid file type.');
                } // Endif.
            } // Endif.
        }

        /**
         * API for plugins.
         * <br /><br />
         * Officegen plugins can extend officegen to support more document formats.
         * <br /><br />
         * Examples how to do it can be found on lib/gendocx.js, lib/genpptx.js and lib/genxlsx.js.
         * @namespace officegen#private#plugs
         * @example <caption>Adding a new document type to officegen</caption>
         * var baseobj = require ( "officegen" );
         *
         * function makeMyDoc ( officegenObj, typeCodeName, options, officegenObjPlugins, typeInfo ) {
	 * 	// officegenObjPlugins = Plugins access to extend officegenObj.
	 * }
         *
         * baseobj.plugins.registerDocType (
         *    'mydoctype', // The document type's code name.
         *    makeMyDoc,
         *    {},
         *    baseobj.docType.TEXT,
         *    "My Special Document File Format"
         * );
         */
        privateData.plugs = {
            /**
             * Add a resource to the list of resources to place inside the output zip file.
             * <br /><br />
             *
             * This method adding a resource to the list of resources to place inside the output document ZIP.
             * <br />
             * Changed by vtloc in 2014Jan10.
             *
             * @param {string} resource_name The name of the resource (path).
             * @param {string} type_of_res The type of this resource: either 'file', 'buffer', 'stream' or 'officegen' (the last one allow you to put office document inside office document).
             * @param {object} res_data Optional data to use when creating this resource.
             * @param {function} res_cb Callback to generate this resource (for 'buffer' mode only).
             * @param {boolean} is_always Is true if this resource is perment for all the zip of this document type.
             * @param {boolean} removed_after_used Is true if we need to delete this file after used.
             * @memberof officegen#private#plugs
             */
            intAddAnyResourceToParse: function (resource_name, type_of_res, res_data, res_cb, is_always, removed_after_used) {
                var newRes = {};

                newRes.name = resource_name;
                newRes.type = type_of_res;
                newRes.data = res_data;
                newRes.callback = res_cb;
                newRes.is_perment = is_always;

                // delete the temporatory resources after used
                // @author vtloc
                // @date 2014Jan10
                if (removed_after_used) {
                    newRes.removed_after_used = removed_after_used;

                } else {
                    newRes.removed_after_used = false;
                } // Endif.

                if (officegenGlobals.settings.verbose) {
                    console.log("[officegen] Push new res : ", newRes);
                } // Endif.

                privateData.resources.push(newRes);
            },

            /**
             * Any additional plugin API must be placed here.
             * @memberof officegen#private#plugs
             */
            type: {}
        };

        // Public API:

        /**
         * Generating the output document stream.
         * <br /><br />
         *
         * The user of officegen must call this method after filling all the information about what to put inside
         * the generated document. This method is creating the output document directly into the given stream object.
         *
         * The options parameters properties:
         *
         * 'finalize' - callback to be called after finishing to generate the document.
         * 'error' - callback to be called on error.
         *
         * @param {object} output_stream The stream to receive the generated document.
         * @param {object} options Way to pass callbacks.
         * @function generate
         * @memberof officegen
         * @instance
         */
        // outWordCallback 是新添加的
        this.generate = function (output_stream, options, outWordCallback) {
            /* 新添加 */
            var xmlDataArr = [];
            var imageSort = 9;
            // 排序
            var contentTypeArr = [
                {
                    sort: 1,
                    path: '/_rels/.rels',
                    content: 'pkg:contentType="application/vnd.openxmlformats-package.relationships+xml" pkg:padding="512"'
                },
                {
                    sort: 2,
                    path: '/word/_rels/document.xml.rels',
                    content: 'pkg:contentType="application/vnd.openxmlformats-package.relationships+xml" pkg:padding="256"'
                },
                {
                    sort: 3,
                    path: '/word/document.xml',
                    content: 'pkg:contentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"'
                },
                {
                    sort: 4,
                    path: '/word/theme/theme1.xml',
                    content: 'pkg:contentType="application/vnd.openxmlformats-officedocument.theme+xml"'
                },
                {
                    sort: 100000,
                    path: '/word/settings.xml',
                    content: 'pkg:contentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"'
                },
                {
                    sort: 100001,
                    path: '/word/webSettings.xml',
                    content: 'pkg:contentType="application/vnd.openxmlformats-officedocument.wordprocessingml.webSettings+xml"'
                },
                {
                    sort: 100002,
                    path: '/word/styles.xml',
                    content: 'pkg:contentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"'
                },
                {
                    sort: 100003,
                    path: '/word/numbering.xml',
                    content: 'pkg:contentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"'
                },
                {
                    sort: 100004,
                    path: '/docProps/core.xml',
                    content: 'pkg:contentType="application/vnd.openxmlformats-package.core-properties+xml" pkg:padding="256"'
                },
                {
                    sort: 100005,
                    path: '/word/fontTable.xml',
                    content: 'pkg:contentType="application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml"'
                },
                {
                    sort: 100006,
                    path: '/docProps/app.xml',
                    content: ' pkg:contentType="application/vnd.openxmlformats-officedocument.extended-properties+xml" pkg:padding="256"'
                },
            ];
            /* 添加结束 */

            if (officegenGlobals.settings.verbose) {
                console.log("[officegen] Start generate() : ", {outputType: privateData.features.outputType});
            }

            if (typeof options == 'object') {
                if (options.finalize) {
                    genobj.on('finalize', options.finalize);
                } // Endif.

                if (options.error) {
                    genobj.on('error', options.error);
                } // Endif.
            } // Endif.

            if (privateData.features.page_name) {
                if (privateData.pages.length == 0) {
                    genobj.emit('error', 'ERROR: No ' + privateData.features.page_name + ' been found inside your document.');
                } // Endif.
            } // Endif.

            // Allow the type generator to prepare everything:
            genobj.emit('beforeGen', privateData);

            var archive = archiver(privateData.features.outputType == 'zip' ? 'zip' : 'tar');

            /**
             * Error handler.
             * <br /><br />
             *
             * This is our error handler method for creating archive.
             *
             * @param {string} err The error string.
             */
            function onArchiveError(err) {
                genobj.emit('error', err);
            }

            archive.on('error', onArchiveError);

            if (privateData.features.outputType == 'gzip') {
                var zlib = require('zlib');
                var gzipper = zlib.createGzip();

                archive.pipe(gzipper).pipe(output_stream);

            } else {
                archive.pipe(output_stream);
            } // Endif.

            /**
             * Add the next resource into the zip stream.
             * <br /><br />
             *
             * This function adding the next resource into the zip stream.
             */
            function generateNextResource(cur_index) {
                if (officegenGlobals.settings.verbose) {
                    console.log("[officegen] generateNextResource(" + cur_index + ") : ", privateData.resources[cur_index]);
                }

                var resStream;

                if (cur_index < privateData.resources.length) {
                    if (typeof privateData.resources[cur_index] != 'undefined') {
                        switch (privateData.resources[cur_index].type) {
                            // Generate the resource text data by calling to provided function:
                            case 'buffer':
                                resStream = privateData.resources[cur_index].callback(privateData.resources[cur_index].data);
                                break;

                            // Just copy the file as is:
                            case 'file':
                                resStream = fs.createReadStream(privateData.resources[cur_index].data || privateData.resources[cur_index].name);
                                break;

                            // Just use this stream:
                            case 'stream':
                                resStream = privateData.resources[cur_index].data;
                                break;

                            // Officegen object:
                            case 'officegen':
                                resStream = new PassThrough();
                                privateData.resources[cur_index].data.generate(resStream);
                                break;

                            // Custom parser:
                            default:
                                for (var cur_parserType in officegenGlobals.resParserTypes) {
                                    if ((cur_parserType == privateData.resources[cur_index].type) && officegenGlobals.resParserTypes[cur_parserType] && officegenGlobals.resParserTypes[cur_parserType].parserFunc) {
                                        resStream = officegenGlobals.resParserTypes[cur_parserType].parserFunc(
                                            genobj,
                                            privateData.resources[cur_index].name,
                                            privateData.resources[cur_index].callback, // Can be used as the template source for template engines.
                                            privateData.resources[cur_index].data,     // The data for the template engine.
                                            officegenGlobals.resParserTypes[cur_parserType].extra_data
                                        );
                                        break;
                                    } // Endif.
                                } // End of for loop.
                        } // End of switch.

                        if (typeof resStream != 'undefined') {
                            if (officegenGlobals.settings.verbose) {
                                console.log('[officegen] Adding into archive : "' + privateData.resources[cur_index].name + '" (' + privateData.resources[cur_index].type + ')...');
                            } // Endif.

                            /* 注释开始 */
                            // archive.append(resStream, {name: privateData.resources[cur_index].name});
                            /* 注释结束 */



                            /* 新添加 */
                            var name = JSON.parse(JSON.stringify(privateData.resources[cur_index].name));   // xml类型
                            name = name.replace(/\\/g, '/');
                            name = '/' + name;
                            var data = null;
                            var contentType = null;
                            var isImg = false;
                            var sort = null;
                            var fleg = true;

                            if (name != '/[Content_Types].xml') {
                                // 图片
                                if (resStream.path) {
                                    imageSort++;
                                    sort = imageSort;
                                    isImg = true;
                                    // 将图片转换成base64
                                    var base64 = fs.readFileSync(resStream.path);
                                    data = new Buffer(base64).toString('base64');
                                    // 获取图片的类型
                                    var type = name.match(/\.(jpg|png|gif|jpeg)$/)[0].replace(/^\./, "");
                                    contentType = 'pkg:contentType="image/' + type + '" pkg:compression="store"';
                                } else {
                                    // 非图片
                                    data = resStream.replace(/^<\?xml version="1.0" encoding="UTF-8" standalone="yes"\?>\n/, "");
                                    // xml的内容替换
                                    if (name == '/word/document.xml') {
                                        data = data.replace(/<w:rPr><w:noProof\/><\/w:rPr>/g, '<w:rPr><w:noProof/><w:lang w:eastAsia="zh-CN" w:bidi="ar-SA"/></w:rPr>');
                                        data = data.replace(/><\/wp:docPr>/g, '/>');
                                        data = data.replace(/w:rsidRDefault="[A-z\d]{8}"><\/w:p>/g, function (word) {
                                            return word.replace(/><\/w:p>$/, '/>');
                                        });
                                    }
                                    // 获取xml文本的排序
                                    for (var i = 0; i < contentTypeArr.length; i++) {
                                        if (contentTypeArr[i].path == name) {
                                            contentType = contentTypeArr[i].content;
                                            sort = contentTypeArr[i].sort;
                                            break;
                                        }
                                    }
                                }
                                // 保存xml文本内容
                                xmlDataArr.push({
                                    "name": name,       // xml文件名
                                    "xml": data,        // xml内容
                                    "contentType": contentType,     // xml类型
                                    "sort": sort,       // xml排序
                                    "isImg": isImg      // 是否是图片
                                });
                            }
                            /* 新添加结束 */

                            generateNextResource(cur_index + 1);

                        } else {
                            if (officegenGlobals.settings.verbose) {
                                console.log("[officegen] resStream is undefined");   // is it normal ??
                            }
                            generateNextResource(cur_index + 1);
                            // setImmediate ( function() { generateNextResource ( cur_index + 1 ); });
                        } // Endif.

                    } else {
                        // Removed resource - just ignore it:
                        generateNextResource(cur_index + 1);
                        // setImmediate ( function() { generateNextResource ( cur_index + 1 ); });
                    } // Endif.

                } else {

                    /* 注释开始 */
                    // now we can remove all temporary resources
                    /*privateData.resources.forEach(function (resource) {
                        if (resource.removed_after_used) {
                            var filename = resource.data || resource.name;

                            if (officegenGlobals.settings.verbose) {
                                console.log("[officegen] Removing resource: ", filename);
                            }

                            fs.unlinkSync(filename);
                        }
                    });

                    // No more resources to add - close the archive:
                    if (officegenGlobals.settings.verbose) {
                        console.log("[officegen] Finalizing archive ...");
                    }
                    archive.finalize();

                    // Event to the type generator:
                    genobj.emit('afterGen', privateData, null, archive.pointer());

                    genobj.emit('finalize', archive.pointer());*/
                    /* 注释结束 */


                    /* 新添加开始 */
                    var xmlFileName = output_stream.path.replace(/docx$/, 'xml');
                    var xmlStart = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<?mso-application progid="Word.Document"?>\n<pkg:package xmlns:pkg="http://schemas.microsoft.com/office/2006/xmlPackage">';
                    var xmlEnd = '</pkg:package>';
                    var whiteIndex = 0;
                    // xml文本排序
                    xmlDataArr.sort(function (a, b) {
                        return a.sort - b.sort;
                    });
                    // xml文件写入头部
                    fs.writeFile(xmlFileName, xmlStart, function (err) {
                        if (err) throw err;
                        // 将第一个xml写入到xml中
                        addXml("0", function () {
                            // 写入xml结尾
                            fs.appendFile(xmlFileName, xmlEnd, function (err) {
                                if (err) throw err;
                                // 将xml文件更名为doc文件
                                fs.rename(xmlFileName, decodeURI(output_stream.path.replace(/docx$/, 'doc')), function (err) {
                                    if (err) throw err;
                                    // 回调
                                    outWordCallback();
                                });
                            });
                        });
                    });
                    function addXml(xmlIndex, callback) {
                        var xmlObj = xmlDataArr[xmlIndex];
                        // 是否写入xml
                        if (whiteIndex < xmlDataArr.length) {
                            // xml是图片时特殊处理
                            var pkg = xmlObj.isImg ? 'pkg:binaryData>' : 'pkg:xmlData>';
                            // 生成xml
                            var xml = '<pkg:part pkg:name="' + xmlObj.name + '" ' + xmlObj.contentType + '>';
                            xml += '<' + pkg + xmlObj.xml + '</' + pkg;
                            xml += '</pkg:part>';
                            // 写入xml
                            fs.appendFile(xmlFileName, xml, function (err) {
                                if (err) throw err;
                                // 递归调用
                                whiteIndex++;
                                addXml(whiteIndex, callback);
                            });
                        } else {
                            callback(); // 回调
                        }
                    }
                    /* 新添加结束 */


                } // Endif.
            }

            // Start the process of generating the output zip stream:
            generateNextResource(0);
        };

        /**
         * Reuse this object for a new document of the same type.
         * <br /><br />
         *
         * Call this method if you want to start generating a new document of the same type using this object.
         * @function startNewDoc
         * @memberof officegen
         * @instance
         */
        this.startNewDoc = function () {
            var kill = [];

            for (var i = 0; i < privateData.resources.length; i++) {
                if (!privateData.resources[i].is_perment) kill.push(i);
            } // End of for loop.

            for (var i = 0; i < kill.length; i++) privateData.resources.splice(kill[i] - i, 1);

            privateData.pages.length = 0;

            genobj.emit('clearDoc', privateData);
        };

        // Public API - plugin API:

        /**
         * Register a new resource to add into the generated ZIP stream.
         * <br /><br />
         *
         * Using this method the user can add extra custom resources into the generated ZIP stream.
         *
         * @param {string} resource_name The name of the resource (path).
         * @param {string} type_of_res The type of this resource: either 'file' or 'buffer'.
         * @param {object} res_data Optional data to use when creating this resource.
         * @param {function} res_cb Callback to generate this resource (for 'buffer' mode only).
         * @function addResourceToParse
         * @memberof officegen
         * @instance
         */
        this.addResourceToParse = function (resource_name, type_of_res, res_data, res_cb) {
            // We don't want the user to add permanent resources to the list of resources:
            privateData.plugs.intAddAnyResourceToParse(resource_name, type_of_res, res_data, res_cb, false);
        };

        if (typeof options == 'string') {
            options = {'type': options};
        } // Endif.

        // See the officegen descriptions for the rules of the options:
        genobj.options = setOptions(options, {'type': 'unknown'});

        if (genobj.options && genobj.options.onerr) {
            genobj.on('error', genobj.options.onerr);
        } // Endif.

        if (genobj.options && genobj.options.onend) {
            genobj.on('finalize', genobj.options.onend);
        } // Endif.

        // Configure this object depending on the user's selected type:
        if (genobj.options.type) {
            setGeneratorType(genobj.options.type);
        } // Endif.

        return this;
    };

    sys.inherits(officegen, events.EventEmitter);

    /**
     * Create a new officegen object.
     * <br /><br />
     *
     * This method creating a new officegen based object.
     */
    module.exports = function (options) {
        return new officegen(options);
    };

    /**
     * Change the verbose state of officegen.
     * <br /><br />
     *
     * This is a global settings effecting all the officegen objects in your application. You should
     * use it only for debugging.
     *
     * @param {boolean} new_state Either true or false.
     */
    module.exports.setVerboseMode = function setVerboseMode(new_state) {
        officegenGlobals.settings.verbose = new_state;
    }

    /**
     * Plugin API effecting all the instances of the officegen object.
     *
     * @namespace officegen#plugins
     */
    var plugins = {
        /**
         * Register a new type of document that we can generate.
         * <br /><br />
         *
         * This method registering a new type of document that we can generate. You can extend officegen to support any
         * type of document that based on resources files inside ZIP stream.
         *
         * @param {string} typeName The type of the document file.
         * @param {function} createFunc The function to use to create this type of file.
         * @param {object} schema_data Information needed by Schema-API to generate this kind of document.
         * @param {string} docType Document type.
         * @param {string} displayName The display name of this type.
         * @memberof officegen#plugins
         */
        registerDocType: function (typeName, createFunc, schema_data, docType, displayName) {
            officegenGlobals.types[typeName] = {};
            officegenGlobals.types[typeName].createFunc = createFunc;
            officegenGlobals.types[typeName].schema_data = schema_data;
            officegenGlobals.types[typeName].type = docType;
            officegenGlobals.types[typeName].display = displayName;
        },

        /**
         * Get a document type object by name.
         * <br /><br />
         *
         * This method get a document type object.
         *
         * @param {string} typeName The name of the document type.
         * @return The plugin object of the document type.
         * @memberof officegen#plugins
         */
        getDocTypeByName: function (typeName) {
            return officegenGlobals.types[typeName];
        },

        /**
         * Register a document prototype object.
         * <br /><br />
         *
         * This method registering a prototype document object. You can place all the common code needed by a group of document
         * types in a single prototype object.
         *
         * @param {string} typeName The name of the prototype object.
         * @param {object} baseObj The prototype object.
         * @param {string} displayName The display name of this type.
         * @memberof officegen#plugins
         */
        registerPrototype: function (typeName, baseObj, displayName) {
            officegenGlobals.docPrototypes[typeName] = {};
            officegenGlobals.docPrototypes[typeName].baseObj = baseObj;
            officegenGlobals.docPrototypes[typeName].display = displayName;
        },

        /**
         * Get a document prototype object by name.
         * <br /><br />
         *
         * This method get a prototype object.
         *
         * @param {string} typeName The name of the prototype object.
         * @return The prototype plugin object.
         * @memberof officegen#plugins
         */
        getPrototypeByName: function getPrototypeByName(typeName) {
            return officegenGlobals.docPrototypes[typeName];
        },

        /**
         * Register a new resource parser.
         * <br /><br />
         *
         * This method registering a new resource parser. One use of this feature is in case that you are developing a new
         * type of document and you want to extend officegen to use some kind of template engine as jade, ejs, haml* or CoffeeKup.
         * In this case you can use a template engine to generate one or more of the resources inside the output archive.
         * Another use of this method is to replace an existing plugin with different implementation.
         *
         * @param {string} typeName The type of the parser plugin.
         * @param {function} parserFunc The resource generating function.
         * @param {object} extra_data Optional additional data that may be required by the parser function.
         * @param {string} displayName The display name of this type.
         * @memberof officegen#plugins
         */
        registerParserType: function (typeName, parserFunc, extra_data, displayName) {
            officegenGlobals.resParserTypes[typeName] = {};
            officegenGlobals.resParserTypes[typeName].parserFunc = parserFunc;
            officegenGlobals.resParserTypes[typeName].extra_data = extra_data;
            officegenGlobals.resParserTypes[typeName].display = displayName;
        },

        /**
         * Get if we need verbose mode.
         * @param {string} docType Optional, Allow filtering by document type.
         * @param {string} moduleName Optional, Allow filtering by feature / module.
         * @memberof officegen#plugins
         */
        getVerboseMode: function (docType, moduleName) {
            if (!docType && !moduleName) {
                return officegenGlobals.settings.verbose ? true : false;
            } // Endif.

            var verboseFlag;

            if (officegenGlobals.settings.verbose && typeof officegenGlobals.settings.verbose === 'object') {
                if (docType && officegenGlobals.settings.verbose.docType && typeof officegenGlobals.settings.verbose.docType === 'object' && officegenGlobals.settings.verbose.docType.indexOf) {
                    verboseFlag = (officegenGlobals.settings.verbose.docType.indexOf(docType) >= 0) ? true : false;
                } // Endif.

                if (verboseFlag !== false && moduleName && officegenGlobals.settings.verbose.moduleName && typeof officegenGlobals.settings.verbose.moduleName === 'object' && officegenGlobals.settings.verbose.moduleName.indexOf) {
                    verboseFlag = (officegenGlobals.settings.verbose.moduleName.indexOf(moduleName) >= 0) ? true : false;
                } // Endif.
            } // Endif.

            return verboseFlag ? true : false;
        }
    };

    module.exports.plugins = plugins;

    module.exports.schema = officegenGlobals.types;

    module.exports.docType = {"TEXT": 1, "SPREADSHEET": 2, "PRESENTATION": 3};

})();
