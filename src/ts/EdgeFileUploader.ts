/// <reference path="./jquery-definitions.d.ts" />


/**
 * Edge.js is a FileUploader system that can be easily established for any use.
 * Inside a form, with auto-upload, without auto-upload, outside a form, etc.
 * It is a multi-browser solution and it is fully customizable to fit your needs.
 * Let it be your number one upload module for JavaScript.
 * @version 0.21a
 */
module Edge { 
    /**
     * Create a new uploader instance on the webpage with the
     * given configuration.
     * @param {FileUploader.IFileUploaderConfig} conf - The configuration object
     * @returns {FileUploader.UploadManager} - The UploadManager-object
     */
    export function create(conf: FileUploader.IFileUploaderConfig):FileUploader.UploadManager {
        return FileUploader.create(conf);
    }


    /**
     * Abstraction of the browser debug to allow granular control on debugging messages
     * by flag.
     */
    class Debugger { 
        public static enabled = true; 

        public static warn(...args: any[]) {
            if (Debugger.enabled) {
                console.log('--------WARNING--------------------');
                
                for (var i in args) {
                    console.warn(args[i]);
                    alert(JSON.stringify(args));

                }
                console.log('-------------------------------');
            }
        }

        public static error(..._error: any[]) {
            if (Debugger.enabled) {
                console.log('--------ERROR--------------------');
                for (var i in _error) {
                    console.error(_error[i]);
                }
                console.log('-------------------------------');
            }
        }

        public static log(...msg: any[]) {
            if (Debugger.enabled) {
                console.log('--------LOG--------------------');
                for (var i in msg) {
                    console.log(msg[i]);
                }
                console.log('-------------------------------');
            }
        }
    }


    /**
     * The primary module
     */
    export module FileUploader {
        /**
         * Create a new uploader instance on the webpage with the
         * given configuration.
         * @param {IFileUploaderConfig} conf - The configuration object
         * @returns {UploadManager} - The UploadManager-object
         */
        export var create: Function = function(conf: IFileUploaderConfig):UploadManager {
            return new UploadManager(conf);
        };

        /**
         * Class with localized human-readable messages
         */
        export class Localization {
            public static __t = {
                uploadFile: 'Upload File...',
                wrongFileTypeError: 'Wrong filetype. Please Upload only supported files.',
                directoryUploadError: 'Directories cannot be read. Please input the files directly.',
                userError: 'Ouch. An unknown error occured.',
                serverError: 'An error occured while upload the file.',
                actionDeleteFile: 'Delete'
            };
        }

        class Errors {
            public static WRONG_FILE_TYPE = {errorCode: 2, localKey: 'wrongFileTypeError'};
            public static DIRECTORY_UPLOAD = {errorCode: 3, localKey: 'directoryUploadError'};
            public static USER_ERROR = {errorCode: 4, localKey: 'userError'};
            public static SERVER_INVALID_RESPONSE = {errorCode: 5, localKey: 'serverError'};
        }


        /**
         * Settings for auto-upload. When enable is set to TRUE the url to the upload is required.
         */
        export interface IFileAutoUploadConfig {
            enable?: boolean;
            url?: string;
        }

        export interface IFileUploaderProcessors {
            /**
             * Is called whenever a catchable error is triggered
             * @param {String} errorMessagehr - error message in human readable (localized) format
             * @param {Object} originalError - Original error data containing details and potential affected files
             */
            onError?: (errorMessageHr: any, originalError: any) => void;

            /**
             * Is called at the moment when a file is being added but has not yet been added.
             * @param {FileParcel} file - The file object
             * @param {UploadManager} uploaderReference - Reference to the uploader object
             * @returns {Boolean} confirmBool - if false file will be rejected and not read or uploaded
             */
            onFileAdd?: (file: FileParcel, uploaderReference: UploadManager) => boolean;

            /**
             * Is called when a files has been confirmed and added to the list. Is not triggered
             * when onFileAdd returned FALSE.
             * @param {FileParcel} file - The file object
             * @param {UploadManager} uploaderReference - Reference to the uploader object
             * @returns {Void}
             */
            onAfterAddedFile?: (file: FileParcel, uploaderReference: UploadManager) => void;

            /**
             * Callback when the uploader (the receiver) gets locked. This happens when
             * there is only single-upload configured and one file was already provided
             * @param {UploadManager} uploaderReference - Reference to the uploader object
             * @returns {Void}
             */
            onLock?: (uploaderReference: UploadManager) => void;

            /**
             * Analogous function to onLock. See reference.
             * @param {UploadManager} uploaderReference - Reference to the uploader object
             * @returns {Void}
             */
            onUnlock?: (uploaderReference: UploadManager) => void;
            onAfterAllFilesUploaded?: (uploaderReference: UploadManager) => void;
            onFileUploaded?: (file: FileParcel, uploaderReference: UploadManager) => void;
            onBeforeDeleteUploaded?: (file: FileParcel, uploaderReference: UploadManager) => void;
            onAfterViewRendered?: (listRenderView: JQElem) => void;
            onBeforeViewRender?: () => void;
        }

        export interface IFileUploaderConfig {
            /**
             * The element to be replaced by the uploader element
             */
            receiver: JQElem;
            idHolderInput?: JQElem;
            fileName: string;
            autoUpload?: IFileAutoUploadConfig;
            multiUpload?: boolean;
            stayInContext?: boolean; //determines if the uploader should NOT move the file-input to the body-end but stay where it is
            fileTypes?: string; //a string that determines what filetypes are allowed.
            noMultiSync?: boolean; //indicates if (when multiple==true) multiple files are allowed to be uploaded at the SAME time. if this is to true, then files get queued
            listRenderView?: JQElem; //if given this will be the holder for any upload indication and action
            processors: IFileUploaderProcessors;
            receiverZIndex?: number;
        }

        class Helper {
            public static f = $;
            private static _inc = 0;

            public static uid() {
                return 'uid_'+Math.round(100*(Math.random()*1000*Math.random()))+'_'+(Helper._inc++);
            }

            public static isString(input: any) {
                var _type = (typeof input).toLowerCase();
                return _type === 'string';
            }

            public static fileApiSupport() {
                //return false;
                return window['File'] && window['FileReader'] && window['FileList'] && window['Blob'] && (typeof FormData).toLowerCase()!=='undefined';
            }

            public static addToStringList(currentStr: string, toAdd: string): string {
                if ((typeof toAdd).toLowerCase()!=='string') {
                    Debugger.error('Non-string type parameter cannot be added to a string list');
                    return currentStr;
                } else {
                    currentStr = Helper.f.trim(currentStr);
                    var isAlreadyContained = false;
                    var stringEntries = currentStr.split(',');
                    for (var entryIndex in stringEntries) {
                        if (stringEntries[entryIndex]==toAdd) {
                            //is already contained
                            isAlreadyContained = true;
                            break;
                        }
                    }

                    if (!isAlreadyContained) {
                        if (currentStr=='') {
                            return toAdd;
                        } else {
                            return currentStr+','+Helper.f.trim(toAdd);
                        }
                    }

                    return currentStr;
                }
            }

            public static removeFromStringList(currentStr: string, toRemove: string): string {
                currentStr = Helper.f.trim(currentStr);
                var stringEntries = currentStr.split(',');
                var newString:string = '';

                for (var entryIndex in stringEntries) {
                    if (stringEntries[entryIndex]!=toRemove) {
                        newString = Helper.addToStringList(newString, stringEntries[entryIndex]);
                    }
                }


                return newString;
            }
        }


        export interface IParcelInputContainer {
            file?: any;
            filename?: string;
            isLinked?: boolean;
            inputField: JQElem;
        }

        export class FileParcel {
            private size:number = -1;
            private filename: string;
            private type: string;
            private file: any;
            private binaryData: string = null;
            private base64Data: string = null;

            private domUploadId: string;
            private uploadStarted: boolean = false;
            private uploadFinished: boolean = false;
            private uploadSucceeded: boolean = false;
            private serverResponse: any; //holds the complete server-response independently of this file
            private serverSaveData: any = null; //holds the data that is important to THIS file (if given)

            private isLinked: boolean;
            private linkedChildren: FileParcel[];
            private destroyed: boolean = false;

            private uploadXhr: any = null; 					//is always null when fileAPI is NOT (!) used
            private correspondingIframe: JQElem = null; 	//is always NULL when fileAPI is used




            public constructor(private container: IParcelInputContainer, private uploadManager: UploadManager) {
                this.linkedChildren = [];

                if (container.file===null) {
                    //its an element
                    Debugger.log('FileParcel is created with ELEMENT (probably no FileAPI)');

                    if (container.filename) {
                        //if filename is already provided, then take it!
                        this.filename = container.filename;
                    } else {
                        this.filename = FileParcel.fileBasename(container.inputField.val());
                    }

                    this.parseTypeByFilename();
                } else {
                    //its a real file
                    Debugger.log('FileParcel is created with EVENT (FileAPI)', container.file);
                    this.file 		= container.file;
                    this.filename 	= FileParcel.fileBasename(this.file.name);
                    this.type 		= this.file.type;

                    this.size = this.file.size;
                }

                this.isLinked 	 	= container.isLinked && container.isLinked===true;
                this.domUploadId 	= 'FileParcel_'+Helper.uid();
            }

            public static fileBasename(inputvalue: string) {
                var fileNameBase:string;
                var fileNameSplit:string[] = inputvalue.split('/');
                fileNameBase = fileNameSplit[fileNameSplit.length - 1];
                fileNameSplit = fileNameBase.split('\\');

                return Helper.f.trim(fileNameSplit[fileNameSplit.length - 1]);
            }

            public getName():string {
                return this.filename;
            }

            public getDomUploadId(): string {
                return this.domUploadId;
            }

            public parseTypeByFilename() {
                var fileSplit: string[] = this.filename.split('.');
                var extension: string = fileSplit[fileSplit.length - 1];

                var _type: string = 'application/unknown';

                if (fileSplit.length > 1) {
                    //if this would not be true then it would be only the filename
                    //without any extension. In that case we cannot determine anything.

                    switch (extension) {
                        case 'php':
                            _type = 'application/x-httpd-php';
                            break;
                        case 'js':
                            _type = 'application/x-javascript';
                            break;
                        case 'tex':
                            _type = 'application/x-latex';
                            break;
                        case 'png':
                            _type = 'image/png';
                            break;
                        case 'gif':
                            _type = 'image/gif';
                            break;
                        case 'jpg':
                            _type = 'image/jpeg';
                            break;
                        case 'jpeg':
                            _type = 'image/jpeg';
                            break;
                        case 'ico':
                            _type = 'image/x-icon';
                            break;
                        case 'csv':
                            _type = 'text/csv';
                            break;
                        case 'css':
                            _type = 'text/css';
                            break;
                        default:
                            break;
                    }
                }

                this.type = _type;
            }



            public checkFileType(fileType: any): boolean {
                if ((typeof fileType).toLowerCase()!=='string') {
                    //is an array of strings to check
                    if (!fileType || fileType.length==0) {
                        return false;
                    }

                    return this.checkFileType(fileType[0]) || this.checkFileType(fileType.slice(1));
                }

                var matchWildcard = fileType.match(/^([a-z]*)\/\*/i);
                if (matchWildcard!==null && matchWildcard.length > 0) {
                    var baseType = matchWildcard[1];
                    var regex = new RegExp('^'+baseType+'\/', 'i');

                    if (regex.test(this.type)) {
                        return true;
                    } else {
                        return false;
                    }
                }

                return fileType===this.type;
            }

            public getSizeMb(): number {
                if (this.size > 0) {
                    return this.getSizeKb() / 1024;
                }

                return this.size;
            }

            public getSizeKb(): number {
                if (this.size > 0) {
                    return this.getSize() / 1024;
                }

                return this.size;
            }

            public getSize(): number {
                return this.size;
            }

            public getFilename(): string {
                return this.filename;
            }

            public getServerData(serverKey: string) {
                if (this.serverSaveData===null) {
                    throw 'You are trying to access data for the file '+this.filename+' although there is no serverData given.';
                } else {
                    if (this.serverSaveData[serverKey]!==undefined) {
                        return this.serverSaveData[serverKey];
                    } else {
                        Debugger.warn('You are accessing a variable that is not existent in here in serverSaveData-Object.');
                        return null;
                    }
                }
            }

            public isImage(): boolean {
                return this.checkFileType('image/*');
            }

            public setBinaryFile(binary: string) {
                this.binaryData = binary;
            }

            public getBinaryFile() {
                return this.binaryData;
            }

            public setDataUrl(base64str: string) {
                this.base64Data = base64str;
            }

            public getDataUrl() {
                return this.base64Data;
            }

            public markAsUploadFinished() {
                this.uploadFinished = true;
            }

            public markUploadSuccess(completeServerResponse: any) {
                this.uploadFinished = true;
                this.uploadSucceeded = true;
                this.serverResponse = completeServerResponse;

                if (this.serverResponse.files && this.serverResponse.files.length > 0) {
                    //go and find self:
                    for (var f in this.serverResponse.files) {
                        if (this.getDomUploadId()==this.serverResponse.files[f].domUploadId) {
                            this.serverSaveData = this.serverResponse.files[f];
                            break;
                        }
                    }
                } else {
                    Debugger.warn('Server did not provide any file information in the JSON-Response.');
                }

                if (!this.isLinked && this.linkedChildren.length>0) {
                    //we have to notify our children that they have finished too!
                    for (var i=0; i<this.linkedChildren.length; i++) {
                        if (this.destroyed) {
                            this.linkedChildren[i].destroy();
                            this.linkedChildren[i].markUploadSuccess(completeServerResponse);
                        }
                    }
                }

                if (!this.destroyed) {
                    this.uploadManager.notifyCompletedUpload(this);
                }
            }

            public read(callback: (FileParcel)=>void) {
                if (this.size < 0) {
                    //no file-api, so just respond
                    callback(this);
                } else {
                    var self_ref: FileParcel = this;
                    var reader = new FileReader();

                    reader.onload = function(response) {
                        var rawData:string = response.target.result;
                        self_ref.setBinaryFile(rawData);

                        var dataUrlReader = new FileReader();
                        dataUrlReader.onload = function(response) {
                            self_ref.setDataUrl(response.target.result);
                            callback(self_ref);
                        };

                        dataUrlReader.readAsDataURL(self_ref.file);
                    };

                    reader.readAsBinaryString(this.file);
                }
            }

            public isVirtual() {
                return this.isLinked;
            }

            public isUploading() {
                return this.uploadStarted && !this.hasFinishedUploading();
            }

            public hasFinishedUploading() {
                return this.uploadFinished;
            }

            public hasSucceededUploading() {
                return this.uploadSucceeded;
            }

            /**
             * This is a very special function. When there are strange combinations of settings
             * it could happen that although fileAPI-Support is disabled that we have a multi-upload.
             * This is only possible in modern browsers if we force the fileAPI to not work.
             * In this case a form with multiple-attribute enabled would upload multiple files at once.
             * But only one upload-id would be provided per upload and with $n uploadfiles we would create
             * $n FileParcels which ALL would trigger the form for themselves. That is why we need one main parcel
             * and link all the others then.
             * @param container expects same data as container-Parameter in FileParcel constructor
             */
            public linkParcel(container: IParcelInputContainer): FileParcel {
                container.isLinked = true;
                this.linkedChildren.push(new FileParcel(container, this.uploadManager));
                return this.linkedChildren[this.linkedChildren.length - 1];
            }

            public uploadToIframe(targetUrl: string, onAfterServerResponse: (f: FileParcel, resp: string)=>void) {
                if (this.isLinked) {
                    throw 'Linked childs cannot trigger uploads';
                }

                var parentForm: JQElem = this.container.inputField.closest('form[target]');
                if (parentForm.length == 0) {
                    throw 'No wrapping form found, breaking here!';
                }

                this.uploadFile(null, targetUrl, onAfterServerResponse, true, parentForm);
            }

            public uploadFile(uploadFileName: string, targetUrl: string, onAfterServerResponse: (f: FileParcel, resp: string)=>void,
                              useIframe?: boolean, parentForm?: JQElem) {
                if (this.isLinked) {
                    throw 'Linked childs cannot trigger uploads';
                }

                var self_ref: FileParcel = this;
                if (useIframe && useIframe===true) {
                    //definetely do NOT use fileapi
                    parentForm.attr('action', targetUrl);
                    var fileInputFieldElem:JQElem = parentForm.find('input[type=file]');
                    fileInputFieldElem.siblings('input[type=hidden]').remove();
                    fileInputFieldElem.after('<input type="hidden" name="domUploadIds[]" value="'+this.getDomUploadId()+'" />');
                    Debugger.log('Activator: '+this.getDomUploadId()+' >>> '+this.filename);

                    //now add ids of linked children:
                    if (this.linkedChildren && this.linkedChildren.length>0) {
                        for (var l=0; l<this.linkedChildren.length; l++) {
                            this.linkedChildren[l].uploadStarted = true;
                            fileInputFieldElem.siblings('input[type=hidden]').last().after('<input type="hidden" name="domUploadIds[]" value="'+this.linkedChildren[l].getDomUploadId()+'" />');
                        }
                    }

                    parentForm.submit();
                    this.correspondingIframe = Helper.f('#'+parentForm.prop('target'));
                    this.correspondingIframe.on('load', function(e) {
                        if (Helper.f.trim(Helper.f(this).html()) == '') {
                            onAfterServerResponse(self_ref, false);
                        } else {
                            var doc = this.contentDocument || this.contentWindow.document;
                            onAfterServerResponse(self_ref, doc.documentElement.innerHTML);
                        }
                    });
                } else {
                    var formData = new FormData();
                    formData.append(this.uploadManager.getFilenameString(), this.file, this.filename);
                    formData.append('domUploadIds[]', this.getDomUploadId());

                    this.uploadXhr = Helper.f.ajax({
                        url: targetUrl,
                        cache: false,
                        processData: false,
                        type: 'post',
                        contentType: false,
                        data: formData,
                        success: function(response) {
                            onAfterServerResponse(self_ref, response);
                        },
                        error: function(jqXHR,textStatus,errorThrown) {
                            if (jqXHR.statusText=='abort') {
                                onAfterServerResponse(self_ref, '{"success": false, "abortedManually": true}');
                            } else {
                                onAfterServerResponse(self_ref, '{"success": false, "abortedManually": false}');
                            }
                        },
                        dataType: 'json'
                    });
                }

                this.uploadStarted = true;
            }


            public destroy(): void {
                if (this.destroyed) {
                    return;
                }

                this.destroyed = true;
                this.container.inputField.remove();

                if (this.correspondingIframe!==null) {
                    var iframeId = this.correspondingIframe.attr('id');
                    //when there is an iframe, then there is a wrapping form with this target.
                    var iframeCorrespondingForm = Helper.f('form[target='+iframeId+']');
                    this.correspondingIframe.remove(); //no more "stop()" needed since it is removed
                    iframeCorrespondingForm.remove();
                }

                if (this.uploadXhr) {
                    console.log(this.uploadXhr.abort());
                }

                Debugger.log('Destroy called on: '+this.filename);

                this.uploadManager.removeActiveParcel(this);
            }

            /**
             * Should be called a time AFTER destroy()
             */
            public makeClean() {
                this.binaryData = null;
                this.base64Data = null;
                //Helper.f('[data-domuploadid="'+this.getDomUploadId()+'"]').remove();
            }
        }

        class FileAction {
            private containsDirs: boolean = false;
            private fileApiEnabled: boolean;

            public constructor(private inputField: JQElem, private e: any, private parent: UploadManager) {
                this.fileApiEnabled = Helper.fileApiSupport();

                if (this.fileApiEnabled) {
                    if (e.target.files.length == 0) {
                        throw 'An obscure error occured. The length of the files was 0 although an event was given';
                    } else {
                        for (var index=0; index<e.target.files.length; index++) {
                            var currentFile = e.target.files[index];
                            if (currentFile.size==0 && (currentFile.type=="" || currentFile.type=="dir" || currentFile.type=="directory")) {
                                this.containsDirs = true;
                            }
                        }
                    }
                }
            }

            public parse(): FileParcel[] {
                if (this.containsDirectories()) {
                    throw 'Cannot parse FileAction=>FileParcel when there are directories contained';
                } else {
                    var parsed: FileParcel[] = [];


                    var _inputField = this.inputField;
                    var _file		= null;
                    if (this.fileApiEnabled) {
                        for (var index=0; index<this.e.target.files.length; index++) {
                            var _file = this.e.target.files[index];
                            parsed.push(new FileParcel({"inputField": _inputField,	"file": _file}, this.parent));
                        }
                    } else {
                        console.log(JSON.stringify(_inputField[0]));
                        //is in form! check if there are multiple file-inputs and IF YES then link the FileParcels


                        if (_inputField[0].files && _inputField[0].files.length>0) {
                            //if for whatever reason the fileappi-support is not given but the .files
                            //does exist (note: this should only happen when forced to programmatically)
                            //then we work on that

                            var responsibleFormParcel: FileParcel = null;
                            responsibleFormParcel =  new FileParcel(
                                {
                                    "inputField": _inputField,
                                    "file": _file,
                                    "filename": _inputField[0].files[0].name
                                },
                                this.parent
                            );
                            parsed.push(responsibleFormParcel);

                            for (var i=1; i<_inputField[0].files.length; i++) {
                                parsed.push(responsibleFormParcel.linkParcel({
                                    "inputField": _inputField,
                                    "file": _file,
                                    "filename": _inputField[0].files[i].name
                                }));
                            }
                        } else {
                            //MUST be single file. Otherwise it would be very strange having a form without obj.files provided
                            //but multiple files supported
                            parsed.push(new FileParcel({ "inputField": _inputField, "file": _file }, this.parent));
                        }
                    }


                    return parsed;
                }
            }

            public containsDirectories(): boolean {
                return this.containsDirs;
            }
        }

        export class UploadManager {
            private static error(errMsg) {
                Debugger.error('UploadManager: '+errMsg);
            }

            private static warn(errMsg) {
                Debugger.warn('UploadManager: '+errMsg);
            }
            //--------------------------------

            private fileSafe: FileParcel[] = [];

            private hiddenElem: JQElem;
            private referenceParent: JQElem;
            private filesElem: JQElem;
            private fileApiEnabled: boolean;
            private autoUploadEnabled: boolean;
            private multiUploadEnabled: boolean;

            private filenameString: string;

            public constructor(private config: IFileUploaderConfig) {
                if (!this.isValidConfig(config)) {
                    Debugger.error('Invalid config. Not initiating Uploader!');
                    return this;
                }

                this.filenameString = config.fileName;

                if (!config.processors) {
                    config.processors = {};
                }

                if (Helper.isString(config.receiver)) {
                    config.receiver =
                        Helper.f(config.receiver);

                    if (config.receiver.length===0) {
                        UploadManager.error("No Element but string was given. Trying to use the string as selector failed");
                        throw 'The given receiver string did not match any dom object';
                        return;
                    }
                }

                if (config.receiver.length>1) {
                    UploadManager.warn("The given receiver contains more than one element. Only the first element will be used");
                }

                config.receiver.addClass('edge-file-uploader').html('<div class="efu-wrapper">'
                +'<div class="efu-hidden"></div>'
                +'<div class="efu-text">'+Localization.__t['uploadFile']+'</div>'
                +'</div>');

                this.referenceParent 	= config.receiver.children('div').first();
                this.hiddenElem 		= config.receiver.find('.efu-hidden').first();
                this.fileApiEnabled 	= Helper.fileApiSupport();

                this.autoUploadEnabled 	= this.config.autoUpload && this.config.autoUpload.enable===true;
                this.multiUploadEnabled = this.config.multiUpload && this.config.multiUpload===true;
                var appendingParent:JQElem;
                var addZIndex:number = -1;

                //when autoUpload is enabled AND stayInContext is not enforced
                //then > when the container is already inside a form, drag it out at its correct position //xfx
                
                
                if (this.autoUploadEnabled && !this.config.stayInContext && config.receiver.closest('form').length!==0) {
                    //autoUpload is wanted. If its a browser without fileApi then this is a problem
                    //when the uploader is inside of a form because we would need to add another form
                    //for the auto-upload and this would result in a <form> element inside a <form> element.
                    //that is why we add it at the end of the body and position it accordingly.
                    appendingParent = config.receiver.closest('body');
                    addZIndex = config.receiverZIndex;
                } else {
                    //in this case the element has to be inside a form anyway so we can add it directly inside
                    appendingParent = config.receiver;
                }

                this.filesElem = appendingParent.append('<div class="efu-files"></div>').children('.efu-files');

                if (addZIndex>0) {
                    this.filesElem.css('z-index', ''+addZIndex);
                    this.listenForResize(true);
                } else {
                    this.listenForResize(false);
                }


                this.filenameString = this.filenameString+'[]';
                //not anymore dependent on multiple files.
                //always using the array indicator simplifies things

                this.pushFile();
                this.processViews(); //initial view-refresh :)
            }

            private processAndRender(): boolean {
                Debugger.log('wants to process and render');
                var processingResult:boolean = this.process();
                this.processViews();

                return processingResult;
            }

            public process(): boolean {
                if (this.fileSafe.length > 0) {
                    //only process if we need auto-upload
                    if (this.autoUploadEnabled) {
                        var filesCurrentlyUploading:boolean = false;

                        for (var i=0; i<this.fileSafe.length; i++) {
                            if (this.fileSafe[i].isUploading()) {
                                filesCurrentlyUploading = true;
                                break;
                            }
                        }

                        if (filesCurrentlyUploading && this.config.noMultiSync) {
                            //have to wait anyway
                            return false;
                        } else {
                            //collect the UN-uploaded files first
                            var unuploadedFiles: FileParcel[] = [];


                            for (var i=0; i<this.fileSafe.length; i++) {
                                if (!this.fileSafe[i].isUploading() && !this.fileSafe[i].hasFinishedUploading()) {
                                    unuploadedFiles.push(this.fileSafe[i]);
                                }
                            }



                            var self_ref: UploadManager = this;
                            var serverResponseHandler = function(file: FileParcel, serverResponse: any) {
                                file.markAsUploadFinished();

                                try {
                                    var responseType = (typeof serverResponse).toLowerCase();

                                    if (responseType!=='object') {
                                        var strippedTags = serverResponse.replace(/(<([^>]+)>)/ig,"");
                                        serverResponse = JSON.parse(strippedTags);
                                    }

                                    if (serverResponse.success && serverResponse.success===true) {
                                        file.markUploadSuccess(serverResponse);
                                    } else {
                                        if ((typeof serverResponse.abortedManually)!='undefined' && serverResponse.abortedManually===true) {
                                            //just delete the file, no error!
                                            file.destroy();
                                        } else {
                                            throw 'Upload went wrong somehow';
                                        }
                                    }


                                } catch (e) {
                                    Debugger.log(e);
                                    self_ref._onError(Errors.SERVER_INVALID_RESPONSE, {serverData: serverResponse, errorFile: file});
                                    file.destroy();
                                }
                            };

                            //we only want to start the first unuploaded one that we found
                            //this is because even if it would be multiple uploads, if they are linked correctly,
                            //they get the information of each other correctly

                            //find first NON-virtual parcel
                            for (var i=0; i<unuploadedFiles.length; i++) {
                                if (!unuploadedFiles[i].isVirtual()) {
                                    //okay, upload!
                                    if (this.fileApiEnabled) {
                                        unuploadedFiles[i].uploadFile(this.filenameString, this.config.autoUpload.url, serverResponseHandler);
                                    } else {
                                        unuploadedFiles[i].uploadToIframe(this.config.autoUpload.url, serverResponseHandler);
                                    }
                                    break;
                                }
                            }


                            if (unuploadedFiles.length>1) {
                                alert('synchronous multi-files not yet supported');
                            }

                            return true;
                        }
                    }
                }

                return false;
            }

            public processViews(): void {
                var hasAnyActiveUploads = false;
                var hasAnyParcels = this.fileSafe.length > 0;
                var uploader: UploadManager = this;

                if (this.config.processors.onBeforeViewRender) {
                    this.config.processors.onBeforeViewRender();
                }

                if (!hasAnyParcels) {
                    this.config.receiver.removeClass('efu-active-uploads');
                    if (this.config.listRenderView) {
                        this.config.listRenderView.html('').hide();
                    }
                } else {
                    var _ul = Helper.f('<ul></ul>');

                    Debugger.log('NEW RENDER');
                    for (var i=0; i<this.fileSafe.length; i++) {
                        var liEntry = Helper.f('<li data-domuploadid="'+this.fileSafe[i].getDomUploadId()+'"></li>');
                        liEntry.append('<div></div>');
                        var liEntryInner = liEntry.children('div');
                        liEntryInner.append('<a class="efu-delete-entry" href="javascript:;">'+Localization.__t.actionDeleteFile+'</a>');

                        var name = this.fileSafe[i].getName();
                        var nameText = name;
                        if (nameText.length > 24) {
                            nameText = nameText.substr(0,20) + '...';
                        }

                        liEntryInner.append('<span class="efu-file-filename efu-file-title" title="'+name+'">'+nameText+'</span>');
                        liEntryInner.append('<span>&nbsp;</span>');

                        if (this.fileSafe[i].hasSucceededUploading()) {
                            liEntry.addClass('efu-success');
                        } else if (this.fileSafe[i].isUploading()) {
                            liEntry.addClass('efu-uploading');
                        }

                        liEntry.find('a.efu-delete-entry').on('click', function(){
                            var theFile:FileParcel = uploader.requestFile($(this).closest('li').data('domuploadid'));
                            theFile.destroy();
                        });

                        _ul.append(liEntry);
                    }

                    if (this.config.listRenderView) {
                        this.config.listRenderView.addClass('edge-file-uploader-view').html(_ul).show()
                            .append('<span class="efu-clearer"></span>');
                    }
                }

                if (this.config.listRenderView && this.config.processors.onAfterViewRendered) {
                    this.config.processors.onAfterViewRendered(this.config.listRenderView);
                }

            }

            public notifyCompletedUpload(file: FileParcel) {
                var all_uploaded: boolean = true;
                for (var i=0; i<this.fileSafe.length; i++) {
                    if (!this.fileSafe[i].hasFinishedUploading()) {
                        all_uploaded = false;
                    }
                }


                if (this.config.idHolderInput) {
                    Debugger.log('idReceiver is given');

                    try {
                        var id = file.getServerData('id');
                        if (!id) {
                            throw 'Could not read id';
                        }
                        this.config.idHolderInput.val(Helper.addToStringList(this.config.idHolderInput.val(), id));
                    } catch (e) {
                        Debugger.warn('It was not possible to read the [id]-Parameter of this file although a idHolderInput was provided (wanted to add an id)');
                        Debugger.log(file);
                    }

                }

                if (this.config.processors.onFileUploaded) {
                    this.config.processors.onFileUploaded(file, this);
                }

                if (all_uploaded && this.config.processors.onAfterAllFilesUploaded) {
                    this.config.processors.onAfterAllFilesUploaded(this);
                }

                this.processAndRender();
            }

            public setInnerText(str: string) {
                this.config.receiver.find('.efu-text').html(str);
            }

            public lock(): void {
                this.config.receiver.addClass('efu-lock');
                this.filesElem.hide();

                if (this.config.processors.onLock) {
                    this.config.processors.onLock(this);
                }
            }

            public unlock(): void {
                this.config.receiver.removeClass('efu-lock');
                this.filesElem.show();
                this.pushFile();

                if (this.config.processors.onUnlock) {
                    this.config.processors.onUnlock(this);
                }
            }

            public _onError(error: any, merge?: any) {
                var localizedMessage: string;

                if (error.errorCode===Errors.USER_ERROR.errorCode) {
                    localizedMessage = merge.userError;
                } else {
                    localizedMessage = Localization.__t[error.localKey];
                }

                if (this.config.processors && this.config.processors.onError) {
                    if (merge) {
                        error = Helper.f.extend({}, error);
                        error = Helper.f.extend(error, merge);
                    }

                    this.config.processors.onError(localizedMessage, error);
                } else {
                    UploadManager.error(error.localKey);
                    alert(localizedMessage);
                }
            }

            public triggerError(userError: any) {
                this._onError(Errors.USER_ERROR, {userError: userError});
            }


            private listenForResize(bReposition?: boolean) {
                var self_ref: UploadManager = this;

                var repos:Function = function(){
                    var coords: ICoords = self_ref.referenceParent.offset();
                    var width: number = self_ref.referenceParent.width();
                    var height: number = self_ref.referenceParent.height();
                    
                    self_ref.filesElem
                        .css('width', width+'px')
                        .css('height', height+'px');
                
                    if (bReposition) {
                        self_ref.filesElem
                            .css('top', coords.top+'px')
                            .css('left', coords.left+'px');
                    }
                };

                Helper.f(window).off('resize.efuResizeListener').on('resize.efuResizeListener', repos);
                repos();
            }

            private isValidConfig(config: IFileUploaderConfig): boolean {
                if (typeof config.fileName=='undefined') {
                    UploadManager.error('fileName is missing but required');
                    return false;
                } else if (this.config.autoUpload &&  this.config.autoUpload.enable===true) {
                    if (!this.config.autoUpload.url) {
                        UploadManager.error('Auto-Upload is enabled but the Upload-URL is missing in the configuration');
                        return false;
                    }
                }

                return true;
            }

            private addActiveParcel(p: FileParcel): UploadManager {
                this.fileSafe.push(p);
                return this;
            }

            public removeActiveParcel(p: FileParcel): UploadManager {
                var maintainingParcels: FileParcel[] = [];
                var fileWithUploadSuccess = p.hasSucceededUploading();

                if (fileWithUploadSuccess) {
                    if (this.config.processors.onBeforeDeleteUploaded) {
                        this.config.processors.onBeforeDeleteUploaded(p, this);
                    }
                }


                Debugger.log('DEL::', p);
                for (var i=0; i < this.fileSafe.length; i++) {
                    if (p.getDomUploadId()===this.fileSafe[i].getDomUploadId()) {
                        continue;
                    }

                    maintainingParcels.push(this.fileSafe[i]);
                }

                p.makeClean();
                this.fileSafe = maintainingParcels;

                if (fileWithUploadSuccess) {
                    //may has to be removed from id-list receiver

                    if (this.config.idHolderInput) {
                        try {
                            var id = p.getServerData('id');
                            if (!id) {
                                throw 'Could not read id';
                            }
                            this.config.idHolderInput.val(Helper.removeFromStringList(this.config.idHolderInput.val(), id));
                        } catch (e) {
                            Debugger.warn('It was not possible to read the [id]-Parameter of this file although a idHolderInput was provided (wanted to remove an id)');
                        }
                    }
                }

                if (this.fileSafe.length===0 && !this.config.multiUpload) {
                    this.unlock();
                }

                this.processViews();
                return this;
            }

            private pushFile(): UploadManager {
                var pushFileElem: JQElem = Helper.f('<input type="file"/>');
                pushFileElem.attr('name', this.filenameString);

                if (this.multiUploadEnabled && this.autoUploadEnabled) {
                    pushFileElem.prop('multiple', true);
                }


                var _form:JQElem = null;
                var _pushed:JQElem = null;


                if (this.autoUploadEnabled && !this.fileApiEnabled) {
                    //no file-api support so we need to wrap with form and add an iframe
                    _pushed = $('<form class="efu-file-entry" enctype="multipart/form-data" target="'+this.addIframe()+'" method="post"><fieldset></fieldset></form>');
                    _pushed.children('fieldset').append(pushFileElem);
                } else {
                    //has fileapi enabled :) good one!
                    _pushed = pushFileElem;
                }
                this.filesElem.prepend(_pushed.addClass('efu-file-entry'));


                var uploaderRef: UploadManager = this;

                pushFileElem.on('change.efuFileChange', function(e){
                    var baseElem:JQElem = uploaderRef.referenceParent.parent().removeClass('dragover');
                    var fileAction: FileAction = new FileAction(Helper.f(this),e,uploaderRef);

                    
                    try {
                        if (fileAction.containsDirectories()) {
                            //cannot work with that. just delete and add another one
                            uploaderRef._onError(Errors.DIRECTORY_UPLOAD);
                            throw 'Directories cannot be handled';
                        } else {
                            //at least no directory
                            var fileParcels: FileParcel[] = fileAction.parse();
                            Debugger.log(fileParcels);
                            

                            if (fileParcels.length > 1 && !uploaderRef.multiUploadEnabled) {
                                fileParcels = [fileParcels[0]];
                            }

                            var wrongTypeParcels: FileParcel[] = [];
                            var currentRead = 0;
                            for (var fileIndex in fileParcels) {
                                currentRead++;

                                if (uploaderRef.config.fileTypes) {
                                    if (!fileParcels[fileIndex].checkFileType(uploaderRef.config.fileTypes)) {
                                        wrongTypeParcels.push(fileParcels[fileIndex]);
                                        continue;
                                    }
                                }

                                fileParcels[fileIndex].read(function(readyParcel: FileParcel){
                                    if (uploaderRef.config.processors.onFileAdd) {
                                        if (uploaderRef.config.processors.onFileAdd(readyParcel, uploaderRef)!==true) {
                                            return;
                                        }
                                    }

                                    uploaderRef.addActiveParcel(readyParcel);

                                    if (uploaderRef.config.processors.onAfterAddedFile) {
                                        uploaderRef.config.processors.onAfterAddedFile(readyParcel, uploaderRef);
                                    }

                                    if (uploaderRef.multiUploadEnabled && uploaderRef.multiUploadEnabled===true) {
                                        uploaderRef.pushFile();
                                    } else {
                                        uploaderRef.lock();
                                    }

                                    uploaderRef.processAndRender();
                                });
                            }

                            if (wrongTypeParcels.length > 0) {
                                //this is done here and not inside the loop because we dont want to break valid files
                                //and also we dont want to fire the error for every file!
                                for (var _f in wrongTypeParcels) {
                                    //wrongTypeParcels[_f].destroy();
                                }
                                uploaderRef._onError(Errors.WRONG_FILE_TYPE, {data: {files: wrongTypeParcels}});
                            }
                        }
                    } catch (err) {
                        UploadManager.warn(err);

                        if (_form!==null) {
                            if (_form.attr('target')) {
                                //now also removing the iframe it would have lead to
                                Helper.f('#'+_form.attr('target')).remove();
                            }
                        }
                        _pushed.remove(); //removing form/input

                        uploaderRef.pushFile();
                        return false;
                    }
                }).on('dragover.efuDragOverFile', function(e){
                    uploaderRef.referenceParent.parent().addClass('dragover');
                }).on('dragleave.efuDragEndFile', function(e) {
                    uploaderRef.referenceParent.parent().removeClass('dragover');
                });

                return this;
            }

            public addIframe(): string {
                var iframe_name:string = 'frame_'+Helper.uid();
                this.hiddenElem.append('<iframe src="about:blank" id="'+iframe_name+'" name="'+iframe_name+'" />');
                return iframe_name;
            }

            public getAll(): FileParcel[] {
                return this.fileSafe;
            }

            public requestFile(domUploadId: string): FileParcel {
                for (var i in this.fileSafe) {
                    if (this.fileSafe[i].getDomUploadId()==domUploadId) {
                        return this.fileSafe[i];
                    }
                }

                return null;
            }


            public submissionFinalizer() {
                if (!this.autoUploadEnabled) {
                    Debugger.error('submissionFinalizer cannot be called when autoUpload was enabled');
                    throw 'Breaking execution...';
                } else {
                    this.config.receiver.html('');
                    this.filesElem.remove();
                }
            }

            public hasActiveUploadingFiles(): boolean {
                if (this.fileSafe.length > 0) {
                    for (var i in this.fileSafe) {
                        if (this.fileSafe[i].isUploading()) {
                            return true;
                        }
                    }
                }

                return false;
            }

            public getFilenameString() {
                return this.filenameString;
            }
        }
    }

}
