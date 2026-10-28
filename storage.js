(function(root){
  'use strict';
  const P=typeof module!=='undefined'?require('./progression.js'):root.Panic;
  class SaveStore {
    constructor(storage){
      this.storage=storage;this.key='penalty-panic-v1';this.raw=null;this.ok=true;this.blocked=false;
      try{this.raw=storage.getItem(this.key);}catch{this.ok=false;}
      const decoded=P.decode(this.raw);this.data=decoded.save;this.status=decoded.status;
      if(['invalid','unsupported'].includes(this.status))this.blocked=true;
    }
    write(){if(this.blocked)return false;try{this.storage.setItem(this.key,JSON.stringify(this.data));this.ok=true;return true;}catch{this.ok=false;return false;}}
    label(){return this.blocked?'Save needs attention — open Settings':this.ok?'Saved on this device':'Session only — storage unavailable';}
    exportText(){return this.blocked?this.raw:JSON.stringify(this.data,null,2);}
    importText(text){
      if(text.length>2e6)throw new Error('That save file is too large.');
      const decoded=P.decode(text);if(['invalid','unsupported','new'].includes(decoded.status))throw new Error('That is not a supported PENALTY PANIC save.');
      this.data=decoded.save;this.blocked=false;this.status='loaded';this.write();return this.data;
    }
    reset(){this.data=P.fresh();this.blocked=false;this.status='new';this.write();return this.data;}
  }
  (root.Panic ||= {}).SaveStore=SaveStore;if(typeof module!=='undefined')module.exports=SaveStore;
})(typeof window==='undefined'?globalThis:window);
