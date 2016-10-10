/**
 * TODO Implement logging
 * @private 
 * @properties={typeid:35,uuid:"7B710B9E-E6C8-44F3-8D74-DABD1198F442",variableType:-4}
 */
var log = scopes.svyLogManager.getLogger('com.servoy.bap.search.SimpleSearch');

/**
 * Creates a search object
 * 
 * @public 
 * @param {String|JSFoundSet|JSRecord} dataSource The data source used
 *
 * @properties={typeid:24,uuid:"BCC9AB14-EA27-4000-8F45-72A9F4A17159"}
 */
function createSimpleSearch(dataSource){
	/** @type {String} */
	var ds = dataSource;
	if(dataSource instanceof JSRecord || dataSource instanceof JSFoundSet){
		ds = dataSource.getDataSource();
	}
	return new SimpleSearch(ds);
}

/**
 * Constructor for SimpleSearch (Use factory methods instead)
 * @private 
 * @constructor 
 * @param {String} dataSource
 *
 * @properties={typeid:24,uuid:"1E917FE8-EB51-4E65-B832-F3D9A26576F9"}
 * @AllowToRunInFind
 */
function SimpleSearch(dataSource){	
	
	/**
	 * @private 
	 * @type {Array<SearchProvider>}
	 */
	var searchProviders = [];
	
	/**
	 * @private 
	 * @type {String}
	 */
	var searchText = '';
	
	/**
	 * @protected  
	 * @type {String}
	 */
	this.dateFormat = 'yyyy/MM/dd';
	
	
	
	/**
	 * @public 
	 * @return {String}
	 */
	this.getDateFormat = function(){
		return this.dateFormat;
	}
	
	/**
	 * @public 
	 * @param {String} format
	 * @return {SimpleSearch}
	 */
	this.setDateFormat = function(format){
		this.dateFormat = format;
		return this;
	}
	
	/**
	 * @public 
	 * @return {String}
	 */
	this.getDataSource = function(){
		return dataSource;
	}
	
	/**
	 * @public 
	 * @param {String} dataProviderID
	 * @param {String} [alias]
	 * @param {Boolean} [impliedSearch]
	 * @param {Boolean} [caseSensitive]
	 * 
	 * @return {SearchProvider}
	 */
	this.addSearchProvider = function(dataProviderID, alias, impliedSearch, caseSensitive){
		
		for(var i in searchProviders){
			if(searchProviders[i].getDataProviderID() == dataProviderID){
				throw new scopes.svyExceptions.IllegalArgumentException('Search Provider already found: ' + dataProviderID);
			}
		}
		
		var sp = new SearchProvider(this,dataProviderID);
		if(alias){
			sp.setAlias(alias);
		}
		if(impliedSearch instanceof Boolean){
			sp.setImpliedSearch(impliedSearch);
		}
		if(caseSensitive instanceof Boolean){
			sp.setCaseSensitive(caseSensitive);
		}
		searchProviders.push(sp);
		return sp;
	}
	
	/**
	 * @public 
	 * @return {Array<SearchProvider>}
	 */
	this.getAllSearchProviders = function(){
		return arrayCopy(searchProviders);
	}
	
	/**
	 * @public 
	 * @return {SearchProvider}
	 */
	this.getSearchProvider = function(aliasOrDataProvider){
		for(var i in searchProviders){
			if(
				searchProviders[i].getDataProviderID() == aliasOrDataProvider ||
				searchProviders[i].getAlias() == aliasOrDataProvider	
			){
				return searchProviders[i]
			}
		}
		return null;
	}
	
//	/**
//	 * @public 
//	 * @param {String} dataProviderID
//	 * @param {String} [alias]
//	 */
//	this.addDataProvider = function(dataProviderID, alias){
//		if(!alias){
//			alias = dataProviderID;
//		}
//		this.dataProviders[alias] = dataProviderID;
//	}
//	
//	/**
//	 * @public 
//	 * @return {Array<String>}
//	 */
//	this.getDataProviderAliases = function(){
//		var a = [];
//		for(var alias in this.dataProviders){
//			a.push(alias);
//		}
//		return a.sort();
//	}
//	
//	/**
//	 * @public 
//	 * @return {String}
//	 */
//	this.getDataProviderID = function(alias){
//		return this.dataProviders[alias];
//	}
	
	/**
	 * @public 
	 * @param {String} text
	 * @return {SimpleSearch}
	 */
	this.setSearchText = function(text){
		searchText = text;
		return this;
	}
	
	/**
	 * @public
	 * @return {String}
	 */
	this.getSearchText = function(){
		return searchText;
	}
	
	/**
	 * @public 
	 * @return {QBSelect}
	 */
	this.getQuery = function(){
		
		var q = databaseManager.createSelect(dataSource);
		q.result.addPk();

		var terms = this.parseSearchTerms();
		
		var and = q.and;
		for(var i in terms){
			
			//	fielded search i.e. company_name:servoy
			if(terms[i].field){
				var alias = terms[i].field;
				var sp = this.getSearchProvider(alias);
				if(!sp){
					// TODO log warning
					application.output('Search alias not found: ' + alias, LOGGINGLEVEL.WARNING);
					continue;
					// TODO Handle aliases which are not found?
				}
				
				var dp = sp.getDataProviderID()
				var column = parseQBColumn(q,dp);
				var value = terms[i].value;
				var valueMax = terms[i].valueMax;
				var type = sp.getJSColumn().getType();
				
				//	APPLY SUBSTITUTIONS
//				if(value instanceof String){
//					/** @type {String} */
//					var str = value;
//					var substitutions = sp.getSubstitutions();
//					for(var s in substitutions){
//						var searchMask = substitutions[s].key;
//						var replaceMask = substitutions[s].value
//						if(!sp.isCaseSensitive()){
//							str = str.replace(new RegExp(searchMask, "ig"),replaceMask);
//						} else {
//							str = utils.stringReplace(str,searchMask,replaceMask);
//						}
//					}
//					value = str;
//				}
				
				//	EXCLUDE MODIFIER
				//	TODO NOT operator causing unexpected results with null values
				if(terms[i].modifiers.exclude){
					if(type == JSColumn.TEXT){
						if(sp.isCaseSensitive()){
							and = and.add(column.not.like('%'+value+'%'));
						} else {
							and = and.add(column.upper.not.like('%'+value.toUpperCase()+'%'));
						}
					} else if(type == JSColumn.DATETIME) {
						/** @type {Date} */
						var min = value;
						var max = new Date(min.getTime());
						max.setHours(23,59,59,999);
						and = and.add(column.not.between(min,max));
					} else {
						and = and.add(column.not.eq(value));
					}
					
				//	EXACT MODIFIER
				} else if(terms[i].modifiers.exact){
					if(type == JSColumn.TEXT){
						if(sp.isCaseSensitive()){
							and = and.add(column.eq(value));
						} else {
							and = and.add(column.upper.eq(value.toUpperCase()));
						}
					} else {
						and = and.add(column.eq(value));
					}
				
				//	GT MODIFIER
				} else if(terms[i].modifiers.gt){
					if(type == JSColumn.DATETIME) {
						/** @type {Date} */
						min = value;
						max = new Date(min.getTime());
						max.setHours(23,59,59,999);
						and = and.add(column.gt(max));
					} else {
						and = and.add(column.gt(value));
					}
					
				// GE MODIFIER
				} else if(terms[i].modifiers.ge){
					and = and.add(column.ge(value));
					
				// LT MODIFIER
				} else if(terms[i].modifiers.lt){
					and = and.add(column.le(value));
				
				// LE MODIFER
				} else if(terms[i].modifiers.le){
					if(type == JSColumn.DATETIME) {
						/** @type {Date} */
						min = value;
						max = new Date(min.getTime());
						max.setHours(23,59,59,999);
						and = and.add(column.le(max));
					} else {
						and = and.add(column.le(value));
					}
					
				//	BETWEEN MODIFIER
				} else if(terms[i].modifiers.between){
					if(type == JSColumn.DATETIME) {
						/** @type {Date} */
						max = valueMax;
						max = new Date(max.getTime());
						max.setHours(23,59,59,999);
						and = and.add(column.between(value,max));
					} else {
						and = and.add(column.between(value,valueMax));
					}
					
				//	NO MODIFER
				} else {
					if(type == JSColumn.TEXT){
						if(sp.isCaseSensitive()){
							and = and.add(column.like('%'+value+'%'));
						} else {
							and = and.add(column.upper.like('%'+value.toUpperCase()+'%'));
						}
					} else if(type == JSColumn.DATETIME) {
						/** @type {Date} */
						min = value;
						max = new Date(min.getTime());
						max.setHours(23,59,59,999);
						and = and.add(column.between(min,max));
					} else {
						and = and.add(column.eq(value));
					}
					
				}
				continue;
			}
			
			
			
			//	implied fields - check all specified data providers
			var or = q.or;
			for(var j in searchProviders){
				sp = searchProviders[j];
				if(!sp.isImpliedSearch()){
					continue;
				}
				
				//	SKIP NON-TEXT types for implied search
				type = sp.getJSColumn().getType();
				if(type != JSColumn.TEXT){
					// TODO Warn of implied search for non-text columns ?
					continue;
				}
				
				dp = sp.getDataProviderID();
				column = parseQBColumn(q,dp);
				value = terms[i].value;
				
				// APPLY SUBSTITUTIONS
				if(value instanceof String){
					/** @type {String} */
					str = value;
					substitutions = sp.getSubstitutions();
					for(s in substitutions){
						searchMask = substitutions[s].key;
						replaceMask = substitutions[s].value
						if(!sp.isCaseSensitive()){
							str = str.replace(new RegExp(searchMask, "ig"),replaceMask);
						} else {
							str = utils.stringReplace(str,searchMask,replaceMask);
						}
					}
					value = str;
				}
				
				//	EXCLUDE MODIFIER
				if(terms[i].modifiers.exclude){
					if(sp.isCaseSensitive()){
						and = and.add(column.not.like('%'+value+'%'));
					} else {
						and = and.add(q.or.add(column.upper.not.like('%'+value.toUpperCase()+'%')).add(column.isNull));
//						and = and.add(column.upper.not.like('%'+value.toUpperCase()+'%'));
					}
					
				//	EXACT MODIFIER
				} else if(terms[i].modifiers.exact){
					if(sp.isCaseSensitive()){
						or = or.add(column.eq(value));
					} else {
						or = or.add(column.upper.eq(value.toUpperCase()));
					}
					
				// GT MODIFIER
				}  else if(terms[i].modifiers.gt){
					or = or.add(column.gt(value));
					
				//	GE MODIFER
				} else if(terms[i].modifiers.ge){
					or  = or.add(column.ge(value));
					
				//	LT MODIFIER
				} else if(terms[i].modifiers.lt){
					or  = or.add(column.le(value));
					
				//	LE MODIFIER
				} else if(terms[i].modifiers.le){
					or  = or.add(column.le(value));
					
				//	BETWEEN MODIFIER
				} else if(terms[i].modifiers.between){
					or = or.add(column.between(terms[i].value,terms[i].valueMax))
					
				//	NO MODIFIER
				} else {
					if(sp.isCaseSensitive()){
						or = or.add(column.like('%'+value+'%'));
					} else {
						or = or.add(column.upper.like('%'+value.toUpperCase()+'%'));
					}
				}
			}
			and = and.add(or);
		}
		q.where.add(and);
		return q;
	}
	
	/**
	 * Get dataset results of search
	 * @public 
	 * @param {Number} [maxRows]
	 * @return {JSDataSet}
	 */
	this.getDataSet = function(maxRows){
		return databaseManager.getDataSetByQuery(this.getQuery(),maxRows)
	}
	
	/**
	 * Gets a new foundset and loads the records in it
	 * @public 
	 * @return {JSFoundSet}
	 */
	this.getFoundSet = function(){
		var fs = databaseManager.getFoundSet(dataSource);
		fs.loadRecords(this.getQuery());
		return fs;
	}
	
	/**
	 * Loads records in existing foundset object
	 * @public 
	 * @param {JSFoundSet} foundset
	 * @return {JSFoundSet}
	 * 
	 */
	this.loadFoundSet = function(foundset){
		foundset.loadRecords(this.getQuery());
		return foundset;
	}
	
	/**
	 * Loads records in the specified foundset
	 * @public 
	 * @param {JSFoundSet} foundSet
	 * @return {Boolean}
	 * 
	 */
	this.loadRecords = function(foundSet){
		return foundSet.loadRecords(this.getQuery());
	}
	
	/**
	 * 
	 * @protected   
	 * @return {Array<{value:*, field:String, modifiers:{exclude:Boolean, exact:Boolean, gt:Boolean, ge:Boolean, lt:Boolean, le:Boolean, between:Boolean, valueMax:*}}>}
	 */
	this.parseSearchTerms = function(){
		var str = searchText;
		var terms = [];
		
		//	parse quoted strings
		var quotedStrings = parseEnclosedStrings(str);
		for(var i in quotedStrings){
			
			//	setup search term value
			var term = {
				value:quotedStrings[i],
				modifiers:{}
			}
			
			//	check quoted value for fielded search, i.e. type:"full time"
			var index = str.indexOf(quotedStrings[i]) - 2;
			if(str.charAt(index) == ':'){
				var last = Math.max(str.lastIndexOf(' ',index),0);
					
				//	setup field
				var field = str.substring(last,index);
				term.field = field;
				
				// FIXME remove ccode duplicated from unquoted
				
				// apply substitutions
				var sp = this.getSearchProvider(term.field);
				if(!sp){
					log.warn('Could not parse search term: "'+s+'". It will be ignored. No search provider or alias named: ' + term.field);
					continue;
				}
				var searchString = term.value;
				var substitutions = sp.getSubstitutions();
				for(var j in substitutions){
					var searchMask = substitutions[j].key;
					var replaceMask = substitutions[j].value
					if(!sp.isCaseSensitive()){
						searchString = searchString.replace(new RegExp(searchMask, "ig"),replaceMask);
					} else {
						searchString = utils.stringReplace(searchString,searchMask,replaceMask);
					}
				}
				term.value = searchString;
				
				var type = sp.getJSColumn().getType();
				if(type == JSColumn.DATETIME){
					term.value = utils.parseDate(term.value,this.getDateFormat());
					if(!term.value){
						// TODO WARN cannot parse date
						continue;
					}
					if(term.valueMax != null){
						term.valueMax = utils.parseDate(term.valueMax,this.getDateFormat());
						if(!term.valueMax){
							// TODO WARN cannot parse date
							continue;
						}
					}
				} else if(type == JSColumn.INTEGER){
					term.value = parseInt(term.value,10);
					if(term.value == NaN){
						// TODO WARN cannot parse 
						continue;
					}
					if(term.valueMax != null){
						term.valueMax = parseInt(term.valueMax,10);
						if(term.valueMax == NaN){
							// TODO WARN cannot parse 
							continue;
						}
					}
				} else if(type == JSColumn.NUMBER){
					term.value = parseFloat(term.value);
					if(term.value == NaN){
						// TODO WARN cannot parse 
						continue;
					}
					if(term.valueMax != null){
						term.valueMax = parseFloat(term.valueMax);
						if(term.valueMax == NaN){
							// TODO WARN cannot parse 
							continue;
						}
					}
				}
				
				
				
				
				
				
				//	remove from search string
				str = utils.stringReplace(str,field+':','');
			}
			
			// remove term from string
			str = utils.stringReplace(str,'"'+quotedStrings[i]+'"','');
			
			terms.push(term);
		}
		
		//	parse unquoted strings
		var unquotedStrings = str.split(' ');
		for(i in unquotedStrings){
			var s = utils.stringTrim(unquotedStrings[i]);
			if(!s){
				continue;
			}
			var term = {
				value:s,
				modifiers:{
					exact:false,
					exclude:false,
					gt:false,
					ge:false,
					lt:false,
					le:false,
					between:false
				},
				field:null,
				valueMax:null
			};
			
			//	parse fielded search
			var info = s.split(':');
			if(info.length > 1){
				term.field = info[0]
				term.value = info[1];
			}
			
			// parse correct value based on fielded search data type
			if(term.field){
				
				//	apply substitutions
				var sp = this.getSearchProvider(term.field);
				if(!sp){
					log.warn('Could not parse search term: "'+s+'". It will be ignored. No search provider or alias named: ' + term.field);
					continue;
				}
				var searchString = term.value;
				var substitutions = sp.getSubstitutions();
				for(var j in substitutions){
					var searchMask = substitutions[j].key;
					var replaceMask = substitutions[j].value
					if(!sp.isCaseSensitive()){
						searchString = searchString.replace(new RegExp(searchMask, "ig"),replaceMask);
					} else {
						searchString = utils.stringReplace(searchString,searchMask,replaceMask);
					}
				}
				term.value = searchString;
				
				var type = sp.getJSColumn().getType();
				if(type == JSColumn.DATETIME){
					term.value = utils.parseDate(term.value,this.getDateFormat());
					if(!term.value){
						// TODO WARN cannot parse date
						continue;
					}
					if(term.valueMax != null){
						term.valueMax = utils.parseDate(term.valueMax,this.getDateFormat());
						if(!term.valueMax){
							// TODO WARN cannot parse date
							continue;
						}
					}
				} else if(type == JSColumn.INTEGER){
					term.value = parseInt(term.value,10);
					if(term.value == NaN){
						// TODO WARN cannot parse 
						continue;
					}
					if(term.valueMax != null){
						term.valueMax = parseInt(term.valueMax,10);
						if(term.valueMax == NaN){
							// TODO WARN cannot parse 
							continue;
						}
					}
				} else if(type == JSColumn.NUMBER){
					term.value = parseFloat(term.value);
					if(term.value == NaN){
						// TODO WARN cannot parse 
						continue;
					}
					if(term.valueMax != null){
						term.valueMax = parseFloat(term.valueMax);
						if(term.valueMax == NaN){
							// TODO WARN cannot parse 
							continue;
						}
					}
				}
			}
			
			//	parse modifiers
			if(term.value instanceof String){
				var mod = term.value.charAt(0);
				if(mod == '-'){
					term.modifiers.exclude = true;
					term.value = term.value.substr(1);
				} else if(mod == '+'){
					term.modifiers.exact = true;
					term.value = term.value.substr(1);
				} else if(mod == '>'){
					if(term.value.charAt(1) == '='){
						term.modifiers.ge = true;
						term.value = term.value.substr(1);
					} else {
						term.modifiers.gt = true;
					}
					term.value = term.value.substr(1);
				} else if(mod == '<'){
					if(term.value.charAt(1) == '='){
						term.modifiers.le = true;
						term.value = term.value.substr(1);
					} else {
						term.modifiers.lt = true;
					}
					term.value = term.value.substr(1);
				} else if(term.value.indexOf('...') != -1){
					term.modifiers.between = true;
					var values = term.value.split('...');
					term.value = values[0];
					term.valueMax = values[1];
				}
			}
			
			terms.push(term);
		}
		return terms;
	}
	
	/**
	 * Sets that all columns are to be searchable
	 * This should be called BEFORE adding any additional, related search providers
	 * 
	 * @public 
	 * @return {SimpleSearch}
	 */
	this.setSearchAllColumns = function(){
		//	clear search providers array
		searchProviders = [];
		
		//	add all columns
		var table = databaseManager.getTable(dataSource);
		var columnNames = table.getColumnNames();
		for(var i in columnNames){
			this.addSearchProvider(columnNames[i]);
		}
		return this;
	}
	
	/**
	 * @private 
	 * @param {SimpleSearch} search
	 * @param {String} dataProviderID
	 * @constructor 
	 * @properties={typeid:24,uuid:"DFA3114F-2B5F-4F21-87B7-01639E8774DD"}
	 */
	function SearchProvider(search, dataProviderID){
		
		
		/**
		 * Alias of data provider
		 * @private 
		 * @type {String}
		 */
		var a = null;
		
		/**
		 * @private 
		 * @type {Boolean}
		 */
		var implied = true;
		
		/**
		 * @private 
		 * @type {Boolean}
		 */
		var caseSensitive = false;
		
		/**
		 * @protected 
		 */
		this.substitutions = {};
		
		/**
		 * @public 
		 * @param {String} key A string to be replaced 
		 * @param {String|Number} value The value to replace it with
		 * @return {SearchProvider} 
		 */
		this.addSubstitution = function(key,value){
			this.substitutions[key] = value;
			return this;
		}
		
		/**
		 * @public 
		 * @return {Array<{key:String,value:String}>}
		 */
		this.getSubstitutions = function(){
			/** @type {Array<{key:String,value:String}>} */
			var substitutions = [];
			for(var key in this.substitutions){
				var value = this.substitutions[key];
				if(value != null){
					substitutions.push({key:key,value:value});
				}
			}
			return substitutions;
		}
		
		/**
		 * @public 
		 * @return {String}
		 */
		this.getDataProviderID = function(){
			return dataProviderID;
		}
		
		/**
		 * TODO Support multiple aliases ?
		 * @public 
		 * @param {String} alias
		 * @return {SearchProvider}
		 */
		this.setAlias = function(alias){
			a = alias;	// TODO: Validate input for spaces & special chars
			return this;
		}
		
		/**
		 * @public 
		 * @return {String}
		 */
		this.getAlias = function(){
			return a;
		}
		
		/**
		 * 
		 * Specifies if this search provider is included in implied search
		 * A value of true indicates that the provider will always be searched
		 * A value of false indicates that provider will ONLY be searched when used in expliccit field matching
		 *  
		 * @public 
		 * @param {Boolean} b
		 * @return {SimpleSearch}
		 */
		this.setImpliedSearch = function(b){
			implied = b;
			return this
		}
		
		/**
		 * @public 
		 * @return {Boolean}
		 */
		this.isImpliedSearch = function(){
			return implied;
		}
		
		/**
		 * @public 
		 * @param {Boolean} b
		 */
		this.setCaseSensitive = function(b){
			caseSensitive = b;
		}
		
		/**
		 * @public 
		 * @return {Boolean}
		 */
		this.isCaseSensitive = function(){
			return caseSensitive;
		}
		
		/**
		 * @public 
		 * @return {JSColumn}
		 */
		this.getJSColumn = function(){
			return parseJSColumnInfo(search.getDataSource(),dataProviderID).column;
		}
		
		/**
		 * @public 
		 * @return {JSTable}
		 */
		this.getJSTable = function(){
			return parseJSColumnInfo(search.getDataSource(),dataProviderID).table;
		}
	}

}

/**
 * TODO Possibly move to svyUtils module
 * 
 * @public 
 * @param {QBSelect} q
 * @param {String} dataProviderID
 * @return {QBColumn}
 * 
 * @properties={typeid:24,uuid:"1C2A89EC-BD4C-4094-8660-8CD354D6129B"}
 */
function parseQBColumn(q, dataProviderID){
	
	var path = dataProviderID.split('.');
	var columnName = path.pop();
	if(!path.length){
		return q.columns[columnName];
	}
	
	var lastJoin = path.pop();
	var joins = q.joins
	for(var i in path){
		joins = joins[path[i]].joins;
	}
	return joins[lastJoin].columns[columnName];
}

/**
 * Parses the JSTable & Column for a given dataprovider in a datasource.
 * Traverses to relation
 * TODO Move to svyUtils data scope
 *  
 * @private 
 * @param {String} dataSource
 * @param {String} dataProviderID
 * @return {{table:JSTable, column:JSColumn}}
 * 
 * @properties={typeid:24,uuid:"ACEDB1CD-3FD3-410F-9279-67DFD6F75FA3"}
 */
function parseJSColumnInfo(dataSource, dataProviderID){
	var table = databaseManager.getTable(dataSource);
	var path = dataProviderID.split('.');
	var colName = path.pop();
	if(path.length){
		var relation = solutionModel.getRelation(path.pop());
		table = databaseManager.getTable(relation.foreignDataSource);
		
	}
	if(!table){
		// TODO warn here
		return null;
	}
	var column = table.getColumn(colName)
	if(!column){
		// TODO warn here
		return null;
	}
	return {table:table, column:column};
}

/**
 * TODO Move to svyUtils String scope
 * 
 * @private  
 * @param {String} text
 * @param {String} [open]
 * @param {String} [close]
 * 
 * @return {Array<String>}
 * 
 * @properties={typeid:24,uuid:"A50F361D-1C67-4370-A8EF-787A904888ED"}
 */
function parseEnclosedStrings(text, open, close){
	if(!open){
		open = '"'
	}
	if(!close){
		close = open;
	}
	open = regexpEscape(open);
	close = regexpEscape(close);
	var pattern = new RegExp(open +'(.*?)' + close,'g');
	var matches = [];
	for(var match=pattern.exec(text); match!=null; match=pattern.exec(text)) {
		matches.push(match[1]);
	}
	return matches;
}

/**
 * TODO Move to String utils scope in svyUtils
 * 
 * @private 
 * @param {String} s
 * @return {String}
 * @properties={typeid:24,uuid:"751B3C31-8B56-45B2-A6F9-7FC161D33489"}
 */
function regexpEscape(s){
    return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

/**
 * Shallow copy of array
 * TODO This should be moved to utils scope
 * @private 
 * @param {Array<*>} a
 * @return {Array<*>}
 * 
 * @properties={typeid:24,uuid:"714324D9-AFD5-4C3E-8462-2D1EB9208ADF"}
 */
function arrayCopy(a){
	var a2 = [];
	a.forEach(function(e){a2.push(e)});
	return a2;
}
