/// <reference path="../../src/ts/jquery-definitions.d.ts" />
/**
* Edge.js is a FileUploader system that can be easily established for any use.
* Inside a form, with auto-upload, without auto-upload, outside a form, etc.
* It is a multi-browser solution and it is fully customizable to fit your needs.
* Let it be your number one upload module for JavaScript.
* @version 0.21a
*/
declare module Edge {
    /**
    * Create a new uploader instance on the webpage with the
    * given configuration.
    * @param {FileUploader.IFileUploaderConfig} conf - The configuration object
    * @returns {FileUploader.UploadManager} - The UploadManager-object
    */
    function create(conf: FileUploader.IFileUploaderConfig): FileUploader.UploadManager;
    /**
    * The primary module
    */
    module FileUploader {
        /**
        * Create a new uploader instance on the webpage with the
        * given configuration.
        * @param {IFileUploaderConfig} conf - The configuration object
        * @returns {UploadManager} - The UploadManager-object
        */
        var create: Function;
        /**
        * Class with localized human-readable messages
        */
        class Localization {
            static __t: {
                uploadFile: string;
                wrongFileTypeError: string;
                directoryUploadError: string;
                userError: string;
                serverError: string;
                actionDeleteFile: string;
            };
        }
        /**
        * Settings for auto-upload. When enable is set to TRUE the url to the upload is required.
        */
        interface IFileAutoUploadConfig {
            enable?: boolean;
            url?: string;
        }
        interface IFileUploaderProcessors {
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
        interface IFileUploaderConfig {
            /**
            * The element to be replaced by the uploader element
            */
            receiver: JQElem;
            idHolderInput?: JQElem;
            fileName: string;
            autoUpload?: IFileAutoUploadConfig;
            multiUpload?: boolean;
            stayInContext?: boolean;
            fileTypes?: string;
            noMultiSync?: boolean;
            listRenderView?: JQElem;
            processors: IFileUploaderProcessors;
        }
        interface IParcelInputContainer {
            file?: any;
            filename?: string;
            isLinked?: boolean;
            inputField: JQElem;
        }
        class FileParcel {
            private container;
            private uploadManager;
            private size;
            private filename;
            private type;
            private file;
            private binaryData;
            private base64Data;
            private domUploadId;
            private uploadStarted;
            private uploadFinished;
            private uploadSucceeded;
            private serverResponse;
            private serverSaveData;
            private isLinked;
            private linkedChildren;
            private destroyed;
            private uploadXhr;
            private correspondingIframe;
            constructor(container: IParcelInputContainer, uploadManager: UploadManager);
            static fileBasename(inputvalue: string): string;
            public getName(): string;
            public getDomUploadId(): string;
            public parseTypeByFilename(): void;
            public checkFileType(fileType: any): boolean;
            public getSizeMb(): number;
            public getSizeKb(): number;
            public getSize(): number;
            public getFilename(): string;
            public getServerData(serverKey: string): any;
            public isImage(): boolean;
            public setBinaryFile(binary: string): void;
            public getBinaryFile(): string;
            public setDataUrl(base64str: string): void;
            public getDataUrl(): string;
            public markAsUploadFinished(): void;
            public markUploadSuccess(completeServerResponse: any): void;
            public read(callback: (FileParcel: any) => void): void;
            public isVirtual(): boolean;
            public isUploading(): boolean;
            public hasFinishedUploading(): boolean;
            public hasSucceededUploading(): boolean;
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
            public linkParcel(container: IParcelInputContainer): FileParcel;
            public uploadToIframe(targetUrl: string, onAfterServerResponse: (f: FileParcel, resp: string) => void): void;
            public uploadFile(uploadFileName: string, targetUrl: string, onAfterServerResponse: (f: FileParcel, resp: string) => void, useIframe?: boolean, parentForm?: JQElem): void;
            public destroy(): void;
            /**
            * Should be called a time AFTER destroy()
            */
            public makeClean(): void;
        }
        class UploadManager {
            private config;
            private static error(errMsg);
            private static warn(errMsg);
            private fileSafe;
            private hiddenElem;
            private referenceParent;
            private filesElem;
            private fileApiEnabled;
            private autoUploadEnabled;
            private multiUploadEnabled;
            private filenameString;
            constructor(config: IFileUploaderConfig);
            private processAndRender();
            public process(): boolean;
            public processViews(): void;
            public notifyCompletedUpload(file: FileParcel): void;
            public setInnerText(str: string): void;
            public lock(): void;
            public unlock(): void;
            public _onError(error: any, merge?: any): void;
            public triggerError(userError: any): void;
            private listenForResize();
            private isValidConfig(config);
            private addActiveParcel(p);
            public removeActiveParcel(p: FileParcel): UploadManager;
            private pushFile();
            public addIframe(): string;
            public getAll(): FileParcel[];
            public requestFile(domUploadId: string): FileParcel;
            public submissionFinalizer(): void;
            public hasActiveUploadingFiles(): boolean;
            public getFilenameString(): string;
        }
    }
}
