/**
 * Constants used for string  matching behavior on individual SearchProviders
 * 
 * @public 
 * @enum 
 * @see SearchProvider.setStringMatching
 * @see SearchProvider.getStringMatching
 * 
 * @properties={typeid:35,uuid:"5732D489-8FD9-4F08-9A18-9F55181B820D",variableType:-4}
 */
var STRING_MATCHING = {
	CONTAINS : 'contains',
	STARTS_WITH : 'starts-with',
	ENDS_WITH : 'ends-with',
	EQUALS : 'equals'
};

/**
 * @private 
 * @enum 
 * @properties={typeid:35,uuid:"41E78B28-7CEC-4845-938B-8FFF46F9B5FA",variableType:-4}
 */
var INTEGER_MAX = {
	INTEGER : java.lang.Integer.MAX_VALUE,
	SMALL_INT : 32767,
	TINY_INT : 127
};

/**
 * The max year that can be used in a WHERE clause. Larger values can be rejected by DB vendors.
 * 
 * @private 
 * @type {Number}
 *
 * @properties={typeid:35,uuid:"2F4408EB-E529-4156-89D3-46F6045E0884",variableType:4}
 */
var YEAR_MAX = 9999;

/**
 * TODO Implement logging
 * @private 
 * @properties={typeid:35,uuid:"7B710B9E-E6C8-44F3-8D74-DABD1198F442",variableType:-4}
 */
var log = scopes.svyLogManager.getLogger('com.servoy.extensions.search.SimpleSearch');

/**
 * The default value for case sensitivity 
 * @private 
 * @type {Boolean}
 * @properties={typeid:35,uuid:"E0F98F03-717E-46F4-81B9-ED2FF4657627",variableType:-4}
 */
var defaultCaseSensitivity = application.getUserProperty('svy.search.defaultCaseSensitivity') == 'true' ? true : false;

/**
 * Creates a search object
 * 
 * @public 
 * @param {String|JSFoundSet|JSRecord} dataSource The data source used
 * @return {SimpleSearch}
 * @properties={typeid:24,uuid:"BCC9AB14-EA27-4000-8F45-72A9F4A17159"}
 */
function createSimpleSearch(dataSource) {
	/** @type {String} */
	var ds = dataSource;
	if (dataSource instanceof JSRecord || dataSource instanceof JSFoundSet) {
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
	var str = searchText == null ? '' : searchText;
	
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
	for (var i in quotedStrings) {
		var value = quotedStrings[i];
		var term = {
			value: value,
			modifiers: {
				exact: false,
				exclude: false,
				gt: false,
				ge: false,
				lt: false,
				le: false,
				between: false
			},
			field: null,
			valueMax: null,
			quoted: true,
			ignored: false
		};

		// check for quoted field search, i.e. country:"united states"
		var index = str.indexOf(value) - 2;
		var leadingChar = str.charAt(index);
		if (leadingChar === ':') {
			var start = str.lastIndexOf(' ', index);
			term.field = str.substring(start, index);
			// remove field from string
			str = utils.stringReplace(str, term.field + ':', '');

			// excluded quoted string, i.e. -"new york"
		} else if (leadingChar === '-') {
			term.modifiers.exclude = true;
			str = str.substring(0, index) + str.substring(index + 1, str.length);
		}

		// remove value from string
		str = utils.stringReplace(str, '"' + value + '"', '');

		// add term
		terms.push(term);
	}
	
	// parse unquoted strings
	var unquotedStrings = str.split(' ');
	for (i in unquotedStrings) {
		var s = utils.stringTrim(unquotedStrings[i]);
		if (!s) {
			continue;
		}

		terms.push({
			value: s,
			modifiers: {
				exact: false,
				exclude: false,
				gt: false,
				ge: false,
				lt: false,
				le: false,
				between: false
			},
			field: null,
			valueMax: null,
			quoted: false
		});
	}
	
	for (i in terms) {
		term = terms[i];
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
function parseField(term) {
	// skip if quoted string
	if (!term.quoted) {

		// parse field name
		var info = term.value.split(':');
		if (info.length > 1) {
			term.field = info[0]
			term.value = info[1];

			// empty value, i.e. "field:"
			if (!term.value.length) {
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
function parseModifiers(term) {
	var mod = term.value.charAt(0);
	if (mod == '-') {
		term.modifiers.exclude = true;
		term.value = term.value.substr(1);
	} else if (mod == '+') {
		term.modifiers.exact = true;
		term.value = term.value.substr(1);
	} else if (mod == '>') {
		if (term.value.charAt(1) == '=') {
			term.modifiers.ge = true;
			term.value = term.value.substr(1);
		} else {
			term.modifiers.gt = true;
		}
		term.value = term.value.substr(1);
	} else if (mod == '<') {
		if (term.value.charAt(1) == '=') {
			term.modifiers.le = true;
			term.value = term.value.substr(1);
		} else {
			term.modifiers.lt = true;
		}
		term.value = term.value.substr(1);
	} else if (term.value.indexOf('...') != -1) {
		term.modifiers.between = true;
		var values = term.value.split('...');
		term.value = values[0];
		term.valueMax = values[1];
	}
	return term;
}

/**
 * Constructor for SimpleSearch (Use factory methods instead)
 * @protected  
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
	 * @protected  
	 * @type {Array<String>}
	 */
	var alternateDateFormat = [];
	
	/**
	 * @protected
	 * @type {String}
	 */
	var onParseCondition = null;
	
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
	 * @param {String} format any date format pattern that will result in a well defined time interval to search for (e.g. MM-yyyy will look for beginning of month to end of month)
	 * 
	 * @example 
	 * <pre>
	 * simpleSearch.setDateFormat("dd/MM/yyyy");
	 * 
	 * //The following are invalid formats
	 * // simpleSearch.setDateFormat("dd/yyyy"); will throw an exception
	 * // simpleSearch.setDateFormat("MM"); will throw an exception
	 *</pre>
	 * 
	 * @return {SimpleSearch} 
	 */
	this.setDateFormat = function(format){
		var parsedFormat = parseDateFormat(format);
		if (!parsedFormat.isValid) {
			throw "Invalid format " + format + '; date format pattern must result in a well defined time interval to search for (e.g. MM-yyyy will look for beginning of month to end of month)';
		}
		
		dateFormat = format;
		return this;
	}
	
	/**
	 * Returns the alternate date format which is used to parse user input for searching dates in addition to the default format
	 * 
	 * @public 
	 * @return {Array<String>}
	 */
	this.getAlternateDateFormats = function(){
		return arrayCopy(alternateDateFormat);
	}
	
	/**
	 * Add alternative date format which is used to parse user input for searching dates in addition to the default format.
	 * 
	 * @public 
	 * @param {String} format any date format pattern that will result in a well defined time interval to search for (e.g. MM-yyyy will look for beginning of month to end of month)
	 * @return {SimpleSearch}
	 * 
	 * 
	 * @example 
	 * <pre>
	 * simpleSearch.addAlternateDateFormat("dd/MM/yyyy");
	 * simpleSearch.addAlternateDateFormat("MM-yyyy");
	 * simpleSearch.addAlternateDateFormat("MM/yyyy");
	 * simpleSearch.addAlternateDateFormat("MMM yyyy");
	 * simpleSearch.addAlternateDateFormat("MMMM yyyy");
	 * simpleSearch.addAlternateDateFormat("yyyy");
	 * ...
	 * 
	 * //The following are invalid formats
	 * // simpleSearch.addAlternateDateFormat("dd/yyyy"); will throw an exception
	 * // simpleSearch.addAlternateDateFormat("MM"); will throw an exception
	 *</pre>
	 */
	this.addAlternateDateFormat = function(format){
		
		var parsedFormat = parseDateFormat(format);
		if (!parsedFormat.isValid) {
			throw "Invalid format " + format + '; date format pattern must result in a well defined time interval to search for (e.g. MM-yyyy will look for beginning of month to end of month)';
		}
		
		// insert format at specific position
		for (var i = 0; i < alternateDateFormat.length; i++) {
			var rank = parseDateFormat(alternateDateFormat[i]).rank;
			if (rank < parsedFormat.rank) {
				alternateDateFormat = scopes.svyJSUtils.arrayInsert(alternateDateFormat, i, format);
				return this;
			}
		}
		
		if (alternateDateFormat.indexOf(format) == -1) {
			alternateDateFormat.push(format);
		}
		return this;
	}
	
	/**
	 * Remove alternative date format which is used to parse user input for searching dates in addition to the default format
	 * 
	 * @public 
	 * @param {String} format
	 * @return {SimpleSearch}
	 */
	this.removeAlternateDateFormat = function(format){
		if (alternateDateFormat.indexOf(format) > -1) {
			alternateDateFormat.splice(alternateDateFormat.indexOf(format), 1);
		}
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
	 * @return {SearchProvider} the Search Provider added or null if the dataProviderID could not be found
	 * 
	 * @example <pre>
	 * simpleSearch.addSearchProvider('orderdate', 'date', false, false);
	 * </pre>
	 * 
	 */
	this.addSearchProvider = function(dataProviderID, alias, impliedSearch, caseSensitive) {
		var sp;

		var jsColumnInfo = parseJSColumnInfo(this.getDataSource(), dataProviderID);
		if (!jsColumnInfo) {
			log.warn('Search Provider cannot be added, because no column was found for: dataSource=' + this.getDataSource() + ', dataProvider=' + dataProviderID);
			return null;
		}
		
		// check if column type is supported
		var type = jsColumnInfo.column.getType();
		if (type != JSColumn.TEXT && type != JSColumn.INTEGER && type != JSColumn.NUMBER && type != JSColumn.DATETIME) {
			log.warn('Search Provider cannot be added, because the dataProvider [' + dataProviderID + '] has unsupported column type [' + jsColumnInfo.column.getTypeAsString() + ']' );
			return null;
		}

		// check if alias or data provider was already added
		var spExists = false;
		for (var i in searchProviders) {
			if (searchProviders[i].getDataProviderID() == dataProviderID) {
				log.warn('Search Provider already added for: ' + dataProviderID + ' and will be updated.');
				spExists = true;
				sp = searchProviders[i];
				break;
			}
		}

		//	 search provider is new
		if (!spExists) {

			// check if relations is x-db (not supported)
			if (dataProviderHasXDBRelation(dataProviderID)) {
				throw new scopes.svyExceptions.IllegalArgumentException('Cross-DB relation found and is not supported. Search provider will not be added');
			}

			sp = new SearchProvider(this, dataProviderID);
			searchProviders.push(sp);
		}

		// update SP
		if (alias) {
			sp.setAlias(alias);
		}
		if (impliedSearch instanceof Boolean) {
			sp.setImpliedSearch(impliedSearch);
		}
		if (caseSensitive instanceof Boolean) {
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
	this.getQuery = function() {

		var q = databaseManager.createSelect(dataSource);
		q.result.addPk();

		try {
			var terms = parse(searchText);
		} catch (e) {
			//TODO: This can fail with an error when dealing with global valuelists (Check why)
			log.error('Error parsing search text', e);
		}
		
		var and = q.and;
		var condition;
		
		/** @type {function({field:String,value:String,valueMax:String,quoted:Boolean,modifiers:{exclude:Boolean,exact:Boolean,gt:Boolean,ge:Boolean,lt:Boolean,le:Boolean,between:Boolean}}, SearchProvider, QBSelect):QBLogicalCondition} */
		var onParseConditionFunction = onParseCondition ? scopes.svySystem.convertQualifiedNameToServoyMethod(onParseCondition) : null;

		for (var i in terms) {
			var term = terms[i];

			//	fielded search i.e. company_name:servoy
			if (term.field) {

				//	get SearchProvider
				var alias = term.field;
				var sp = this.getSearchProvider(alias);
				if (!sp) {
					log.warn('Search alias not found: ' + alias + '. Search term will be ignored');
					continue;
				}

				// check for empty field value
				if (!term.value) {
					log.warn('Explicit search term for field [' + term.field + '] contains no value. Search term will be ignored.')
					continue;
				}
				
				if (onParseCondition) {
					condition = onParseConditionFunction.call(this, term, sp, q);
					if (condition instanceof QBLogicalCondition) {
						and = and.add(condition);
						continue;
					}
				}

				// append condition
				condition = this.parseCondition(term, sp, q);
				if (!condition) {
					log.debug('Search provider with alias [' + sp.getAlias() + '] will be skipped for value "' + term.value + '"');
					continue;
				}
				and = and.add(condition);
				continue;
			}

			// implied fields - check all specified data providers
			var logical = term.modifiers.exclude ? q.and : q.or;
			for (var j in searchProviders) {
				sp = searchProviders[j];

				// skip non-implied search
				if (!sp.isImpliedSearch()) {
					continue;
				}
				
				if (onParseCondition) {
					condition = onParseConditionFunction.call(this, term, sp, q);
					if (condition instanceof QBLogicalCondition) {
						logical = logical.add(condition);
						continue;
					}
				}

				// append condition
				condition = this.parseCondition(term, sp, q);
				if (!condition) {
					log.debug('Search provider [' + sp.getDataProviderID() + '] will be skipped for value "' + term.value + '"');
					continue;
				}
				logical = logical.add(condition);
			}
			and = and.add(logical);
		}
		q.where.add(and);
		return q;
	}
	
	/**
	 * Parses a condition from a search term
	 * @protected  
	 * @param {{field:String,value:String,valueMax:String,quoted:Boolean,modifiers:{exclude:Boolean,exact:Boolean,gt:Boolean,ge:Boolean,lt:Boolean,le:Boolean,between:Boolean}}} term
	 * @param {SearchProvider} sp
	 * @param {QBSelect} q
	 * @return {QBCondition}
	 */
	this.parseCondition = function(term, sp, q) {

		// Prepare column metadata
		var dp = sp.getDataProviderID()
		var column = parseQBColumn(q, dp);
		var jsColumn = sp.getJSColumn();
		var type = jsColumn.getType();
		var columnLength = jsColumn.getLength();
		var valueDateFormat;
		/** @type {String} */
		var value;
		/** @type {String} */
		var valueMax;

		// apply substitutions
		if (term.value) {
			value = sp.applySubstitutions(term.value);
		}
				
		// CHECK TYPE
		if (type != JSColumn.TEXT && type != JSColumn.INTEGER && type != JSColumn.NUMBER && type != JSColumn.DATETIME) {
			// should i check if type is unsupported ?
			log.warn('SearchProvider [' + dp + '] has unsupported column type [' + jsColumn.getTypeAsString() + ']' );
			return null;
		}

		// CHECK INT COLUMN MAX
		if(type == JSColumn.INTEGER){
			var sqlType = jsColumn.getSQLType();
			var max = INTEGER_MAX.INTEGER;
			
			switch (sqlType) {
				
				// REGULAR (32-bit) INT
				case java.sql.Types.INTEGER:
					max = INTEGER_MAX.INTEGER
					break;
				
				// SMALL INT
				case java.sql.Types.SMALLINT:
					max = INTEGER_MAX.SMALL_INT
					break;
				
				// TINY INT
				case java.sql.Types.TINYINT:
					max = INTEGER_MAX.TINY_INT
					break;
					
				// BIT
				case java.sql.Types.BIT:
					max = INTEGER_MAX.TINY_INT
					break;
				
				// BOOLEAN
				case java.sql.Types.BOOLEAN:
					max = INTEGER_MAX.TINY_INT
					break;
						
				default:
					log.warn('Unexpected integer SQL type: ' + sqlType);
					break;
			}
			
			// CHECK MAX
			if(value >= max){
				log.debug('Value exceeds max integer value ('+max+') defined for SearchProvider ('+sp.getAlias()+') SQL type ('+sqlType+'). SearchProvider will be ignored');
				return null;
			}
		}
		
		
		// INTEGER CAST IN QUERY
		if(sp.isCastInteger() && type == JSColumn.INTEGER){
			column = column.cast(QUERY_COLUMN_TYPES.TYPE_TEXT)
			type = JSColumn.TEXT;
		
		// CAST VALUE
		} else {
			valueDateFormat = sp.getMatchingDateFormat(value);
			value = sp.cast(value);
			if (value === null) {
				log.debug('Could not cast value for search provider data type for dataprovider ' + dp);
				return null;
			}
		}

		// HANDLE MAX VALUE
		if (term.valueMax) {
			valueMax = sp.applySubstitutions(term.valueMax);
			// date format should match
			if (sp.getMatchingDateFormat(valueMax) != valueDateFormat) {
				log.debug('Format of max value doesn\'t match min value format on search provider for dataprovider ' + dp);
				return null;
			}
			valueMax = sp.cast(valueMax);
			if (valueMax == NaN || valueMax == null) {
				log.debug('Could not cast value max for search provider data type for dataprovider ' + dp);
				return null;
			}
		}
		
		// DATE SEARCH IS ALWAYS BETWEEN MIN-MAX VALUE
		if (type === JSColumn.DATETIME) {
			var formatObj = parseDateFormat(valueDateFormat);
			
			var maxDate = valueMax ? new Date(valueMax) : new Date(value.getTime());
			
			// move valueMax to last date available (depending on format)
			if (formatObj.second) { 				// Match till next seconds
				maxDate = new Date(maxDate.getTime() + 1000);
			} else if (formatObj.minute) { 			// Match till minute
				maxDate = new Date(maxDate.getTime() + 60000);
			} else if (formatObj.hour) { 			// Match till hour
				maxDate = new Date(maxDate.getTime() + 3600000);
			} else if (formatObj.day) { 			//Till end of the Day
				maxDate = scopes.svyDateUtils.toEndOfDay(maxDate);
			} else if (formatObj.month) {			// Till end of the Month
				maxDate = scopes.svyDateUtils.toEndOfDay(scopes.svyDateUtils.getLastDayOfMonth(maxDate));			
			} else if (formatObj.year) {			// Till end of the Year
				maxDate = scopes.svyDateUtils.toEndOfDay(scopes.svyDateUtils.getLastDayOfYear(maxDate));
			} else {
				// Can't handle other type of Searches
				log.debug('Could not search for dataprovider ' + dp + ' with dateFormat ' + valueDateFormat);
				return null;
			}
			
			// update valueMax
			valueMax = maxDate;
			
			if (sp.getUseLocalDateTime() == false) {
				// get the server time date to be used for the search
				value = scopes.svyDateUtils.getServerDateTime(new Date(value.getTime()));
				valueMax = scopes.svyDateUtils.getServerDateTime(new Date(valueMax.getTime()));
			}
		}
		
		// PREVENT SEARCHES FOR UUIDs USING LIKE OR ANY OPERATOR OTHER THAN eq
		if (jsColumn.hasFlag(JSColumn.UUID_COLUMN)) {
			//check whether search value is a UUID
			var uuidValue = application.getUUID(value);
			if (!uuidValue) {
				return null;
			}
			if (term.modifiers.exclude) {
				return column.not.eq(value);
			} else {
				return column.eq(value);				
			}
		}

		var matchMode = sp.getStringMatching();
		var textOperator = matchMode === STRING_MATCHING.EQUALS ? 'eq' : 'like';

		//	APPLY Modifiers

		//	EXCLUDE MODIFIER
		//	TODO NOT operator causing unexpected results with null values
		if (term.modifiers.exclude) {

			if (type == JSColumn.TEXT) {

				/** @type {String} */
				var textValue = value;

				// CHECK STRING MATCHING MODE
				if (matchMode == STRING_MATCHING.STARTS_WITH || matchMode == STRING_MATCHING.CONTAINS) {
					textValue = textValue + '%';
				}
				if (matchMode == STRING_MATCHING.ENDS_WITH || matchMode == STRING_MATCHING.CONTAINS) {
					textValue = '%' + textValue;
				}
				
				// Check column length to avoid unnecessary queries and possible DB errors
				if (columnLength > 0 && matchMode == STRING_MATCHING.CONTAINS && textValue.length === columnLength + 2) {
					// searching for e.g. %12345% on a column with length 5; there can be no like match, so doing exact search
					if (sp.isCaseSensitive()) {
						return column.not.eq(value);
					} else {
						return column.upper.not.eq(q.functions.upper(value));
					}
				} else if (columnLength > 0 && matchMode == STRING_MATCHING.CONTAINS && textValue.length == columnLength + 1) {
					// searching for e.g. %1234% on a column with length 5
					// that could be a problem for DBs that do not accept search parameters longer than the column
					// turning that specific case into an extra AND
					if (sp.isCaseSensitive()) {
						return q.and.add(column.not.like(value + '%')).add(column.not.like('%' + value));
					} else {
						return q.and.add(column.upper.not.like(q.functions.upper(value + '%'))).add(column.upper.not.like(q.functions.upper('%' + value)));
					}
				}
				
				if (columnLength > 0 && textValue.length > columnLength) {
					// value does not fit in column and cannot be found
					log.debug('Search value longer than column ' + dp);
					return null;
				}

				// CHECK CASE-SENSITIVITY
				if (sp.isCaseSensitive()) {
					return column.not[textOperator](textValue);
				}
				return column.upper.not[textOperator](q.functions.upper(textValue));
			}

			if (type == JSColumn.DATETIME) {
				return column.not.between(value, valueMax);
			}
			return column.not.eq(value);
		}
		
		// Check column length to avoid unnecessary queries and possible DB errors
		if (type === JSColumn.TEXT && columnLength > 0) {
			if (value.length > columnLength) {
				// value does not fit in column and cannot be found
				log.debug('Search value longer than column ' + dp);
				return null;
			} else if (term.modifiers.between && valueMax && valueMax.length > columnLength) {
				// max value for between search larger than the column; turn this into a >= query
				term.modifiers.ge = true;
			}
		}

		// EXACT MODIFIER
		if (term.modifiers.exact) {
			if (type == JSColumn.TEXT) {
				if (sp.isCaseSensitive()) {
					return column.eq(value);
				}
				return column.upper.eq(q.functions.upper(value));
			}
			return column.eq(value);
		}

		// GT MODIFIER
		if (term.modifiers.gt) {
			if (type == JSColumn.DATETIME) {
				return column.gt(valueMax);
			}
			return column.gt(value);
		}

		// GE MODIFIER
		if (term.modifiers.ge) {
			return column.ge(value);
		}

		// LT MODIFIER
		if (term.modifiers.lt) {
			return column.lt(value);
		}

		// LE MODIFER
		if (term.modifiers.le) {
			if (type == JSColumn.DATETIME) {
				return column.le(valueMax);
			}
			return column.le(value);
		}

		// BETWEEN MODIFIER
		if (term.modifiers.between) {
			if (type == JSColumn.DATETIME) {
				return column.between(value, valueMax);
			}
			return column.between(value, valueMax);
		}

		// NO MODIFER...
		if (type == JSColumn.TEXT) {
			textValue = value;

			// CHECK STRING MATCHING MODE
			matchMode = sp.getStringMatching();
			if (matchMode == STRING_MATCHING.STARTS_WITH || matchMode == STRING_MATCHING.CONTAINS) {
				textValue = textValue + '%';
			}
			if (matchMode == STRING_MATCHING.ENDS_WITH || matchMode == STRING_MATCHING.CONTAINS) {
				textValue = '%' + textValue;
			}
			
			if (columnLength > 0 && matchMode == STRING_MATCHING.CONTAINS && textValue.length === columnLength + 2) {
				// searching for %12345% on a column with length 5; there can be no like match, so doing exact search
				if (sp.isCaseSensitive()) {
					return column.eq(value);
				} else {
					return column.upper.eq(q.functions.upper(value));
				}
			} else if (columnLength > 0 && matchMode == STRING_MATCHING.CONTAINS && textValue.length == columnLength + 1) {
				// searching for %1234% on a column with length 5
				// that could be a problem for DBs that do not accept search parameters longer than the column
				// turning that specific case into an extra OR
				if (sp.isCaseSensitive()) {
					return q.or.add(column.like(value + '%')).add(column.like('%' + value));
				} else {
					return q.or.add(column.upper.like(q.functions.upper(value + '%'))).add(column.upper.like(q.functions.upper('%' + value)));
				}
			}

			// CHECK CASE-SENSITIVITY
			if (sp.isCaseSensitive()) {
				return column[textOperator](textValue);
			}
			return column.upper[textOperator](q.functions.upper(textValue));
		}

		if (type == JSColumn.DATETIME) {
			return column.between(value, valueMax);
		}
		
		return column.eq(value);
	}
	
	/**
	 * Executes the search and returns the results as a JSDataSet
	 * 
	 * @public 
	 * @param {Number} [maxRows]
	 * @return {JSDataSet}
	 */
	this.getDataSet = function(maxRows){
		return databaseManager.getDataSetByQuery(this.getQuery(), maxRows > 0 ? maxRows : -1);
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
	 * Sets a callback method that is fired whenever a query for a given filter is applied<p>
	 * This can be used to either modify the filter before the query is created
	 * or to enhance the provided QBSelect yourself<p>
	 * To prevent the filter from adding criteria to the query as it would normally do, the method being
	 * called can return <code>false</code><p>
	 * The method called receives these parameters<ul>
	 * 
	 * <code>@param {{field:String,value:String,valueMax:String,quoted:Boolean,modifiers:{exclude:Boolean,exact:Boolean,gt:Boolean,ge:Boolean,lt:Boolean,le:Boolean,between:Boolean}}} term</code></br>
	 * <code>@param {SearchProvider} sp </code></br>
	 * <code>@param {QBSelect} qbSelect the query to enhance</code></br>
	 * 
	 * @param {function({field:String,value:String,valueMax:String,quoted:Boolean,modifiers:{exclude:Boolean,exact:Boolean,gt:Boolean,ge:Boolean,lt:Boolean,le:Boolean,between:Boolean}}, SearchProvider, QBSelect):QBLogicalCondition} callback
	 * 
	 * 
	 * @return {SimpleSearch}
	 *
	 * @public
	 * 
	 *  */
	this.setOnParseCondition = function(callback) {
		onParseCondition = scopes.svySystem.convertServoyMethodToQualifiedName(callback);
		return this;
	}	
}

/**
 * @protected 
 * @param {SimpleSearch} search
 * @param {String} dataProviderID
 * @constructor
 * @properties={typeid:24,uuid:"DFA3114F-2B5F-4F21-87B7-01639E8774DD"}
 */
function SearchProvider(search, dataProviderID) {

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
	var caseSensitive = defaultCaseSensitivity;
	
	/**
	 * @private 
	 * @type {Boolean}
	 */
	var castInteger = false;
	
    /**
     * @protected 
     * @type {Boolean}
     */
    var useLocalDateTime = false;

	/**
	 * @protected
	 */
	this.substitutions = { };

	/**
	 * @private
	 * @type {String}
	 */
	var stringMatchingMode = STRING_MATCHING.CONTAINS;

	/**
	 * Add a substitution kev-value pair to this search provider
	 * Substitutions provide replacement capability for user input.
	 * A typical use case involves parsing a value list display value
	 * @public
	 * @param {String} key A string to be replaced
	 * @param {String|Number} value The value to replace it with
	 * @return {SearchProvider}
	 */
	this.addSubstitution = function(key, value) {
		this.substitutions[key] = value;
		return this;
	}

	/**
	 * Get all the keys for substitutions
	 * @public
	 * @return {Array<String>}
	 */
	this.getSubstitutionsKeys = function() {
		var keys = [];
		for (var key in this.substitutions) {
			var value = this.substitutions[key];
			if (value != null) {
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
	this.getSubstitutionValue = function(key) {
		var value = this.substitutions[key];
		return value;
	}

	/**
	 * Gets the data provider ID
	 * @public
	 * @return {String} The data provider which will be searched
	 */
	this.getDataProviderID = function() {
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
	this.setAlias = function(alias) {
		a = alias; // TODO: Validate input for spaces & special chars
		return this;
	}

	/**
	 * Gets the alias of this search provider.
	 * @public
	 * @return {String} The alias, or null if none was specified
	 */
	this.getAlias = function() {
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
	this.setImpliedSearch = function(b) {
		implied = b;
		return this;
	}

	/**
	 * Indicates if this SearchProvider is an implied search
	 * @public
	 * @return {Boolean}
	 */
	this.isImpliedSearch = function() {
		return implied;
	}

	/**
	 * Specifies if this SearchProvider will perform case-sensitive searches
	 * @public
	 * @param {Boolean} b
	 * @return {SearchProvider}
	 */
	this.setCaseSensitive = function(b) {
		caseSensitive = b;
		return this;
	}

	/**
	 * Indicates if this SearchProvider is case-sensitive
	 * @public
	 * @return {Boolean}
	 */
	this.isCaseSensitive = function() {
		return caseSensitive;
	}
	
	/**
	 * Sets the search provider to make use of useLocalDateTime
	 * @public 
	 * @param {Boolean} flag
	 * @return {SearchProvider}
	 */
	this.setUseLocalDateTime = function(flag) {
		useLocalDateTime = flag;
		return this;
	}	

	/**
	 * Indicate if the search provider for a Date make use of useLocalDateTime
	 * @public 
	 * @return {Boolean}
	 */
	this.getUseLocalDateTime = function() {
		return useLocalDateTime;
	}

	/**
	 * Get the JSColumn object that corresponds to this search provider
	 * @public
	 * @return {JSColumn}
	 */
	this.getJSColumn = function() {
		var jsColumn = parseJSColumnInfo(search.getDataSource(), dataProviderID);
		return !jsColumn ? null : jsColumn.column;
	}

	/**
	 * Get the JSTable object that corresponds to this search provider
	 *
	 * @public
	 * @return {JSTable}
	 */
	this.getJSTable = function() {
		var jsColumn = parseJSColumnInfo(search.getDataSource(), dataProviderID);
		return !jsColumn ? null : jsColumn.table;
	}

	/**
	 * Apply defined substitutions to a given string
	 * @public
	 * @param {String} value The value for which substitutions will be applied
	 * @return {String} the value after substitutions
	 */
	this.applySubstitutions = function(value) {

		//	get all keys. Sort them so based on string length descending to avoid one key replacing part of another
		var keys = this.getSubstitutionsKeys().sort(function(s1, s2) {
			if (s1.length > s2.length) return -1;
			if (s1.length < s2.length) return 1;
			return 0;
		});

		for (var j in keys) {

			//	replace key
			var searchMask = keys[j].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			var replaceMask = this.getSubstitutionValue(searchMask);
			if (!this.isCaseSensitive()) {
				value = value.replace(new RegExp(searchMask, "ig"), replaceMask);
			} else {
				value = utils.stringReplace(value, searchMask, replaceMask);
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
	this.cast = function(value) {
		var type = this.getJSColumn().getType();
		var parsedValue = null;
		if (type == JSColumn.DATETIME && value) {
			try {
				
				// parse date format if there is any match
				var matchingDateFormat = this.getMatchingDateFormat(value);
				if (matchingDateFormat) {
					parsedValue = utils.parseDate(value, matchingDateFormat);
				}
				
				var invalidDate = utils.parseDate("99999999999999", "yyyy")
				// check invalid date
				if (parsedValue && parsedValue === invalidDate){
					parsedValue = null;
				}
				
				// check max year
				if (parsedValue && parsedValue.getFullYear() > YEAR_MAX){
					parsedValue = null;
				}
				
				return parsedValue;
			} catch (e) {
				return null;
			}
		}
		
		if (type == JSColumn.INTEGER) {
			if(this.isCastInteger()){
				return value;
			}
			parsedValue = new Number(value);
			if (isNaN(parsedValue)) return null;
			return parsedValue;
		}
		
		if (type == JSColumn.NUMBER) {
			parsedValue = new Number(value);
			if (isNaN(parsedValue)) return null;
			return parsedValue;
		}

		if (type == JSColumn.TEXT) {
			return value;
		}

		log.warn('SearchProvider [' + this.getDataProviderID() + '] has unsupported column type');
		return value;
	}
	
	/**
	 * Returns the first matching dateFormat compatible with the given value
	 *
	 * @public
	 * @param {String} value The value to be matched with the availale dateFormats
	 * @return {String} The matching date format
	 */
	this.getMatchingDateFormat = function(value) {
		var type = this.getJSColumn().getType();
		if (type == JSColumn.DATETIME && value) {
			try {
				var defaultParsedValue = utils.parseDate(value, search.getDateFormat());
			} catch (e) {

			}

			// does value match any of the set date formats ? e.g. yyyy-MM-dd|yyyy/MM/dd|yyyy-MM|yyyy-MM|yyyy
			var dateFormats = search.getAlternateDateFormats();
			for (var i = 0; !parsedValue && i < dateFormats.length; i++) {
				try {
					var parsedValue = utils.parseDate(value, dateFormats[i]);
					if (parsedValue) {
						// return the format with higher ranking between default format and alternate formats
						if (defaultParsedValue) {
							var defaultFormatRank = parseDateFormat(search.getDateFormat()).rank;
							var alternateFormatRank = parseDateFormat(dateFormats[i]).rank;
							return defaultFormatRank < alternateFormatRank ? dateFormats[i] : search.getDateFormat();
						}

						// alternate format if default format is not valid
						return dateFormats[i];
					}
				} catch (e) {

				}
			}
			// default format if valid
			return defaultParsedValue ? search.getDateFormat() : null;
		}
		return null;
	}

	/**
	 * Sets the string matching mode. Allowed values are [STRING_MATCHING.CONTAINS, STRING_MATCHING.STARTS_WITH, STRING_MATCHING.ENDS_WITH]
	 * Behavior for this search provider will use the matching mode. SearchProvider instances are initialized with a default of CONTAINS
	 * @public
	 * @param {String} matching The string matching type. Must be one of the constants in STRING_MATCHING enum
	 * @return {SearchProvider}
	 * @see STRING_MATCHING
	 */
	this.setStringMatching = function(matching) {
		if (!matching) throw 'param "matching" cannot be null/empty';
		var valid = false;
		for (var i in STRING_MATCHING) {
			if (STRING_MATCHING[i] == matching) {
				valid = true;
				break;
			}
		}
		if (!valid) throw 'param "matching" must be one of the values in scopes.svySearch.STRING_MATCHING.XXX';
		stringMatchingMode = matching;
		return this;
	}

	/**
	 * @public
	 * @return {String} The string matching mode used
	 */
	this.getStringMatching = function() {
		return stringMatchingMode;
	}
	
	/**
	 * Sets that this INTEGER SearchProvider will be treated like TEXT in the query and all other text-based configurations will apply (i.e. LIKE operators, etc)
	 * Use this function if the data provider should be searched as text. For example: "1025" could show invoices 10250,10251,1052,etc. because of a LIKE operator.
	 * @public 
	 * @param {Boolean} b TRUE to cast the SearchProvider
	 * @return {SearchProvider} This SearchProvider for call chaining.
	 */
	this.setCastInteger = function(b){
		if(b && this.getJSColumn().getType() != JSColumn.INTEGER){
			application.output('Attempt to set integer-to-text casting on a non-integer column. This will be ignored', LOGGINGLEVEL.WARNING);
			return this;
		}
		castInteger = b === true;
		return this;
	}
	
	/**
	 * Return the cast integer setting for this SearchProvider
	 * @public 
	 * @return {Boolean}
	 * @see setCastInteger
	 */
	this.isCastInteger = function(){
		return castInteger === true;
	}
}

/**
 * Gets the version of this module
 * @public 
 * @return {String} the version of the module using the format Major.Minor.Revision
 * @properties={typeid:24,uuid:"3CD7D454-23F4-48A3-BE8C-61C302CC5D67"}
 */
function getVersion() {
    return application.getVersionInfo()['svySearch'];
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
function parseQBColumn(q, dataProviderID) {
	var path = dataProviderID.split('.');
	var columnName = path.pop();
	if (!path.length) {
		return q.columns[columnName];
	}

	var lastJoin = path.pop();
	var joins = q.joins
	for (var i in path) {
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
function parseJSColumnInfo(dataSource, dataProviderID) {
	var table = databaseManager.getTable(dataSource);
	var path = dataProviderID.split('.');
	var colName = path.pop();
	if (path.length) {
		var relation = solutionModel.getRelation(path.pop());
		table = databaseManager.getTable(relation.foreignDataSource);
	}
	if (!table) {
		log.warn('Parse column info failed. No table found for: ' + dataSource);
		return null;
	}
	var column = table.getColumn(colName)
	if (!column) {
		log.warn('Parse column info failed. No column found for: dataSource=' + dataSource + ', dataProvider=' + dataProviderID);
		return null;
	}
	return { table: table, column: column };
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
function parseEnclosedStrings(text, open, close) {
	if (!open) {
		open = '"'
	}
	if (!close) {
		close = open;
	}
	open = regexpEscape(open);
	close = regexpEscape(close);
	var pattern = new RegExp(open + '(.*?)' + close, 'g');
	var matches = [];
	for (var match = pattern.exec(text); match != null; match = pattern.exec(text)) {
		matches.push(match[1]);
	}
	return matches;
}

/**
 * @param {String} dateFormat
 * @private 
 * @return {{
 * 		year: Boolean,
		month: Boolean,
		day: Boolean,
		hour: Boolean,
		minute: Boolean,
		second: Boolean,
		rank: Number,
		isValid: Boolean
 * }}
 *
 * @properties={typeid:24,uuid:"3081B172-5C00-45F3-B53A-CF40ED2C8DE6"}
 */
function parseDateFormat(dateFormat) {
	var rank = 0;
	var isValid = false;
	var isInvalid = false;
	var format = {
		year: false,
		month: false,
		day: false,
		hour: false,
		minute: false,
		second: false,
		rank: -1,
		isValid: false
	}
	
	if (/yyyy|YYYY|yy|YY|y|Y|Yr/.test(dateFormat)){
		// format has year
		format.year = true;
		rank += 1000;
		isValid = true;
	} else {
		isInvalid = true;
	}
	
	if (/M|MM|MMM|MMMM/.test(dateFormat)) {
		// format has month
		format.month = true;
		isValid = isValid && !isInvalid;
		rank += 100;
	}  else {
		isInvalid = true;
	}
	
	if (/dd|DD|DDD|Day|DAY|D|d/.test(dateFormat)) {
		// format has day
		format.day = true;
		// 
		isValid = isValid && (!isInvalid || /D|DD|DDD/.test(dateFormat))// && format.year));
		rank += 10;
	} else {
		isInvalid = true;
	}

	if (/HH|hh|KK|kk/.test(dateFormat)) {
		// format has hour
		format.hour = true;
		isValid = isValid && !isInvalid;
		rank += 1;
	} else {
		isInvalid = true;
	}
	
	if (/m|mm/.test(dateFormat)) {
		// format has minute
		format.minute = true;
		isValid = isValid && !isInvalid;
		rank += 0.1;
	} else {
		isInvalid = true;
	}
	
	if (/s|ss/.test(dateFormat)) {
		// format has second
		format.second = true;
		isValid = isValid && !isInvalid;
		rank += 0.01;
	} else {
		isInvalid = true;
	}
	
	// set a rank
	if (rank > 0) {
		format.rank = rank;
	}
	
	// set valid format
	format.isValid = isValid;
	
	return format;
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
function arrayCopy(a) {
	var a2 = [];
	a.forEach(function(e) {
		a2.push(e)
	});
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
function dataProviderHasXDBRelation(dataProviderID) {
	var path = dataProviderID.split('.');
	path.pop();
	while (path.length) {
		var relationName = path.pop()
		if (scopes.svyDataUtils.isCrossDBRelation(relationName)) {
			log.warn('Invalid data provider [' + dataProviderID + '] has a cross-database relation [' + relationName + '] which is not supported');
			return true;
		}
	}
	return false;
}

