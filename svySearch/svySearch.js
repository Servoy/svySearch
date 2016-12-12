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
 * @return {SimpleSearch}
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
 * @private  
 * @param {String} searchText
 * @return {Array<{
 * 		field:String,
 * 		value:String, 
 * 		valueMax:String, 
 * 		quoted:Boolean,
 * 		modifiers:{exclude:Boolean, exact:Boolean, gt:Boolean, ge:Boolean, lt:Boolean, le:Boolean, between:Boolean}}>}
 * }>}
 *
 * @properties={typeid:24,uuid:"766A2B1B-C8C9-44E1-9C8A-1EF44E60AEB8"}
 */
function parse(searchText){
	
	// copy searchText to overwrite
	var str = searchText;
	
	/**
	 * terms that will be parsed 
	 * @type {Array<{
	 * 		field:String,
	 * 		value:String, 
	 * 		valueMax:String, 
	 * 		quoted:Boolean,
	 * 		modifiers:{exclude:Boolean, exact:Boolean, gt:Boolean, ge:Boolean, lt:Boolean, le:Boolean, between:Boolean}}>}
	 * }>} */
	
	var terms = [];
	
	//	parse quoted terms
	var quotedStrings = parseEnclosedStrings(str);
	
	for(var i in quotedStrings){
		terms.push({
			value:quotedStrings[i],
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
			valueMax:null,
			quoted:true,
			ignored:false
		});
		
		// remove term from string
		str = utils.stringReplace(str,'"'+quotedStrings[i]+'"','');
	}
	
	// parse unquoted strings
	var unquotedStrings = str.split(' ');
	for(i in unquotedStrings){
		var s = utils.stringTrim(unquotedStrings[i]);
		if(!s){
			continue;
		}
		
		terms.push({
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
			valueMax:null,
			quoted:false
		});
	}
	
	for(i in terms){
		var term = terms[i];
		parseField(term);
		parseModifiers(term);
		
	}
	return terms;
}

/**
 * @private  
 * @param {{
 * 		field:String,
 * 		value:String, 
 * 		valueMax:String,
 * 		quoted:Boolean, 
 * 		modifiers:{exclude:Boolean, exact:Boolean, gt:Boolean, ge:Boolean, lt:Boolean, le:Boolean, between:Boolean}}} term
 * @return {{
 * 		field:String,
 * 		value:String, 
 * 		valueMax:String, 
 * 		quoted:Boolean,
 * 		modifiers:{exclude:Boolean, exact:Boolean, gt:Boolean, ge:Boolean, lt:Boolean, le:Boolean, between:Boolean}}}
 *
 * @properties={typeid:24,uuid:"CD125763-4A68-4C3F-93D3-F8029CD16F5E"}
 */
function parseField(term){
	
	// skip if quoted string
	if(!term.quoted){
		
		// parse field name
		var info = term.value.split(':');
		if(info.length > 1){
			term.field = info[0]
			term.value = info[1];
			
			// empty value, i.e. "field:"
			if(!term.value.length){
				log.warn('Parsed term with empty value for field: ' + term.field + ':' + term.value);
			}
		}
	}
	
	return term;
}

/**
 * @private 
 * @param {{
 * 		field:String,
 * 		value:String, 
 * 		valueMax:String, 
 * 		modifiers:{exclude:Boolean, exact:Boolean, gt:Boolean, ge:Boolean, lt:Boolean, le:Boolean, between:Boolean}}} term
 * @return {{
 * 		field:String,
 * 		value:String, 
 * 		valueMax:String, 
 * 		modifiers:{exclude:Boolean, exact:Boolean, gt:Boolean, ge:Boolean, lt:Boolean, le:Boolean, between:Boolean}}}
 *
 * @properties={typeid:24,uuid:"0AE587E6-4D24-4868-863A-9EC7DF5EA5F4"}
 */
function parseModifiers(term){
	
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
	return term;
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
	var dateFormat = 'yyyy/MM/dd';
	
	
	
	/**
	 * Returns the date format which is used to parse user input for searching dates
	 * 
	 * @public 
	 * @return {String}
	 */
	this.getDateFormat = function(){
		return dateFormat;
	}
	
	/**
	 * Sets the date formatting which will be used to parse user input
	 * @public 
	 * @param {String} format
	 * @return {SimpleSearch}
	 */
	this.setDateFormat = function(format){
		dateFormat = format;
		return this;
	}
	
	/**
	 * Returns the data source used by the search object
	 * @public 
	 * @return {String}
	 */
	this.getDataSource = function(){
		return dataSource;
	}
	
	/**
	 * @public 
	 * @param {String} dataProviderID The data provider that will be searched. Can be columns, related columns
	 * @param {String} [alias] The natural language name of the search provider. Used in explicit searches.
	 * @param {Boolean} [impliedSearch] Set this false to indicate that a provider is not searchable unless explicitly referenced
	 * @param {Boolean} [caseSensitive] Set this to be true to force case-sensitive search on this search provider
	 * 
	 * @return {SearchProvider}
	 * 
	 * @example <pre>
	 * simpleSearch.addSearchProvider('orderdate', 'date', false, false);
	 * </pre>
	 * 
	 */
	this.addSearchProvider = function(dataProviderID, alias, impliedSearch, caseSensitive){
		var sp;
		
		// check if alias or data provider was already added
		var spExists = false;
		for(var i in searchProviders){
			if(searchProviders[i].getDataProviderID() == dataProviderID){
				log.warn('Search Provider already added for: ' + dataProviderID + ' and will be updated.');
				spExists = true;
				sp = searchProviders[i];
				break;
			}
		}
		
		//	 search provider is new
		if(!spExists){
			
			// check if relations is x-db (not supported)
			if(dataProviderHasXDBRelation(dataProviderID)){
				throw new scopes.svyExceptions.IllegalArgumentException('Cross-DB relation found and is not supported. Search provider will not be added');
			}
			
			sp = new SearchProvider(this,dataProviderID);
			searchProviders.push(sp);
		}
		
		// update SP
		if(alias){
			sp.setAlias(alias);
		}
		if(impliedSearch instanceof Boolean){
			sp.setImpliedSearch(impliedSearch);
		}
		if(caseSensitive instanceof Boolean){
			sp.setCaseSensitive(caseSensitive);
		}
		
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
	 * Gets the specified SearchProvider
	 * @public 
	 * @param {String} aliasOrDataProvider The name or alias of the data provider
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
	 * Set the raw, user input to be parsed
	 * @public 
	 * @param {String} text The raw text to be parsed
	 * @return {SimpleSearch}
	 */
	this.setSearchText = function(text){
		searchText = text;
		return this;
	}
	
	/**
	 * Gets the raw, unparsed input text
	 * @public
	 * @return {String}
	 */
	this.getSearchText = function(){
		return searchText;
	}
	
	/**
	 * Creates and returns a query object parsed from the user input
	 * @public 
	 * @return {QBSelect}
	 */
	this.getQuery = function(){
		
		var q = databaseManager.createSelect(dataSource);
		q.result.addPk();

		var terms = parse(searchText);
		var and = q.and;
		for(var i in terms){
			var term = terms[i];
			
			//	fielded search i.e. company_name:servoy
			if(term.field){
				
				//	get SearchProvider
				var alias = term.field;
				var sp = this.getSearchProvider(alias);
				if(!sp){
					log.warn('Search alias not found: ' + alias + '. Search term will be ignored');
					continue;
				}
				
				// check for empty field value
				if(!term.value){
					log.warn('Explicit search term for field ['+term.field+'] contains no value. Search term will be ignored.')
					continue;
				}
				
				//	Prepare column metadata
				var dp = sp.getDataProviderID()
				var column = parseQBColumn(q,dp);
				var type = sp.getJSColumn().getType();
				
				//	apply substitutions
				if(term.value){
					var value = sp.applySubstitutions(term.value);
				}
				if(term.valueMax){
					var valueMax = sp.applySubstitutions(term.valueMax);
				}
				
				//	cast
				value = sp.cast(value);
				valueMax = sp.cast(valueMax);
				
				//	APPLY Modifiers
				
				//	EXCLUDE MODIFIER
				//	TODO NOT operator causing unexpected results with null values
				if(term.modifiers.exclude){
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
				} else if(term.modifiers.exact){
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
				} else if(term.modifiers.gt){
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
				} else if(term.modifiers.ge){
					and = and.add(column.ge(value));
					
				// LT MODIFIER
				} else if(term.modifiers.lt){
					and = and.add(column.lt(value));
				
				// LE MODIFER
				} else if(term.modifiers.le){
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
				dp = sp.getDataProviderID();
				column = parseQBColumn(q,dp);
				value = terms[i].value;
				
				//	skip non-implied search
				if(!sp.isImpliedSearch()){
					continue;
				}
				
				//	SKIP NON-TEXT types for implied search
				type = sp.getJSColumn().getType();
				if(type != JSColumn.TEXT){
					// TODO Warn of implied search for non-text columns ?
					continue;
				}
				
				// APPLY SUBSTITUTIONS
				value = sp.applySubstitutions(value);
				
				// APPLY SUBSTITUTIONS
//				if(value instanceof String){
//					/** @type {String} */
//					str = value;
//					substitutions = sp.getSubstitutions();
//					for(s in substitutions){
//						searchMask = substitutions[s].key;
//						replaceMask = substitutions[s].value
//						if(!sp.isCaseSensitive()){
//							str = str.replace(new RegExp(searchMask, "ig"),replaceMask);
//						} else {
//							str = utils.stringReplace(str,searchMask,replaceMask);
//						}
//					}
//					value = str;
//				}
				
				//	EXCLUDE MODIFIER
				if(terms[i].modifiers.exclude){
					if(sp.isCaseSensitive()){
						and = and.add(column.not.like('%'+value+'%'));
					} else {
						and = and.add(q.or.add(column.upper.not.like('%'+value.toUpperCase()+'%')).add(column.isNull));
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
					or  = or.add(column.lt(value));
					
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
	 * Executes the search and returns the results as a JSDataSet
	 * 
	 * @public 
	 * @param {Number} [maxRows]
	 * @return {JSDataSet}
	 */
	this.getDataSet = function(maxRows){
		return databaseManager.getDataSetByQuery(this.getQuery(),maxRows)
	}
	
	/**
	 * Creates a factory foundset, runs the search and returns it
	 * @public 
	 * @return {JSFoundSet}
	 */
	this.getFoundSet = function(){
		var fs = databaseManager.getFoundSet(dataSource);
		fs.loadRecords(this.getQuery());
		return fs;
	}
	
	/**
	 * Loads records in the specified foundset
	 * @public 
	 * @param {JSFoundSet} foundSet The JSFoundSet object upon which to load records
	 * @return {Boolean} True indicates query was successful, although may have loaded zero records
	 * 
	 */
	this.loadRecords = function(foundSet){
		return foundSet.loadRecords(this.getQuery());
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
		 * Add a substitution kev-value pair to this search provider
		 * Substitutions provide replacement capability for user input.
		 * A typical use case involves parsing a value list display value
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
		 * Get all the keys for substitutions
		 * @public 
		 * @return {Array<String>}
		 */
		this.getSubstitutionsKeys = function(){
			var keys = [];
			for(var key in this.substitutions){
				var value = this.substitutions[key];
				if(value != null){
					keys.push(key);
				}
			}
			return keys;
		}
		
		/**
		 * Get the substitution value for a given key
		 * @public 
		 * @param {String} key The substitution key
		 * @return {String}
		 */
		this.getSubstitutionValue = function(key){
			var value = this.substitutions[key];
			return value;
		}
		
		/**
		 * Gets the data provider ID
		 * @public 
		 * @return {String} The data provider which will be searched
		 */
		this.getDataProviderID = function(){
			return dataProviderID;
		}
		
		/**
		 * Sets the natural language name for this SearchProvider
		 * The alias can be used in explicit searches
		 * TODO Support multiple aliases ?
		 * @public 
		 * @param {String} alias The alias
		 * @return {SearchProvider}
		 */
		this.setAlias = function(alias){
			a = alias;	// TODO: Validate input for spaces & special chars
			return this;
		}
		
		/**
		 * Gets the alias of this search provider. 
		 * @public 
		 * @return {String} The alias, or null if none was specified
		 */
		this.getAlias = function(){
			return a;
		}
		
		/**
		 * 
		 * Specifies if this search provider is included in implied search
		 * A value of true indicates that the provider will always be searched
		 * A value of false indicates that provider will ONLY be searched when used in explicit field matching
		 *  
		 * @public 
		 * @param {Boolean} b
		 * @return {SearchProvider}
		 */
		this.setImpliedSearch = function(b){
			implied = b;
			return this;
		}
		
		/**
		 * Indicates if this SearchProvider is an implied search
		 * @public 
		 * @return {Boolean}
		 */
		this.isImpliedSearch = function(){
			return implied;
		}
		
		/**
		 * Specifies if this SearchProvider will perform case-sensitive searches
		 * @public 
		 * @param {Boolean} b
		 * @return {SearchProvider}
		 */
		this.setCaseSensitive = function(b){
			caseSensitive = b;
			return this;
		}
		
		/**
		 * Indicates if this SearchProvider is case-sensitive
		 * @public 
		 * @return {Boolean}
		 */
		this.isCaseSensitive = function(){
			return caseSensitive;
		}
		
		/**
		 * Get the JSColumn object that corresponds to this search provider
		 * @public 
		 * @return {JSColumn}
		 */
		this.getJSColumn = function(){
			return parseJSColumnInfo(search.getDataSource(),dataProviderID).column;
		}
		
		/**
		 * Get the JSTable object that corresponds to this search provider
		 * 
		 * @public 
		 * @return {JSTable}
		 */
		this.getJSTable = function(){
			return parseJSColumnInfo(search.getDataSource(),dataProviderID).table;
		}
		
		/**
		 * Apply defined substitutions to a given string 
		 * @public 
		 * @param {String} value The value for which substitutions will be applied
		 * @return {String} the value after substitutions
		 */
		this.applySubstitutions = function(value){
			
			//	get all keys
			var keys = this.getSubstitutionsKeys()
			for(var j in keys){
				
				//	replace key
				var searchMask = keys[j];
				var replaceMask = this.getSubstitutionValue(searchMask);
				if(!this.isCaseSensitive()){
					value = value.replace(new RegExp(searchMask, "ig"),replaceMask);
				} else {
					value = utils.stringReplace(value,searchMask,replaceMask);
				}
			}
			return value;
		}
		
		/**
		 * Casts a given string into a value compatible with the search provider's data type
		 * 
		 * @public  
		 * @param {String} value The value to be parsed
		 * @return {Date|Number|String} The parsed value
		 */
		this.cast = function(value){
			
			var type = this.getJSColumn().getType();
			if(type == JSColumn.DATETIME){
				return utils.parseDate(value,dateFormat);
			}
			if(type == JSColumn.INTEGER){
				return parseInt(value,10);
			}
			if(type == JSColumn.NUMBER){
				return parseFloat(value);
			}
			if(type == JSColumn.TEXT){
				return value;
			}
			
			log.warn('SearchProvider ['+this.getDataProviderID()+'] has unsupported column type');
			return value;
		}
	}

}

/**
 * TODO Possibly move to svyUtils module
 * 
 * @private  
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

/**
 * Check a data provider string for presence of a relation which is cross-database
 * @private 
 * @param {String} dataProviderID
 * @return {Boolean}
 *
 * @properties={typeid:24,uuid:"5D004F36-C8D2-4072-894D-C14E11D5E462"}
 */
function dataProviderHasXDBRelation(dataProviderID){
	var path = dataProviderID.split('.');
	path.pop();
	while(path.length){
		var relation = solutionModel.getRelation(path.pop());
		var primaryServer = databaseManager.getDataSourceServerName(relation.primaryDataSource);
		var foreignServer = databaseManager.getDataSourceServerName(relation.foreignDataSource);
		if(primaryServer != foreignServer){
			log.warn('Invalid data provider ['+dataProviderID+'] has a cross-database relation ['+relation.name+'] which is not supported');
			return true;
		}
	}
	return false;
}