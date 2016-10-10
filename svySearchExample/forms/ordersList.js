/**
 * @type {String}
 *
 * @properties={typeid:35,uuid:"4103E342-5758-4B1A-BEE5-0F0CAF347BB6"}
 */
var searchText = ''
	
/**
 * Basic search on specified data providers
 * @properties={typeid:24,uuid:"E235968B-143E-4209-B89C-267F6305B66C"}
 */
function onSearch(){
	
	//	 load all records when search is cleared
	if(!searchText){
		foundset.loadAllRecords();
		return;
	}
	
	//	list of data providers to include in search
	var searchProviders = [
		'orderdate',
		'shipaddress',
		'shipcity',
		'shipcountry',
		'shippostalcode',
		
		// related data providers
		'orders_to_customers.companyname',
		'orders_to_employees.firstname',
		'orders_to_employees.lastname',
		
		//	N-levels depth on relations
		'orders_to_order_details.order_details_to_products.productname'
	];
	
	//	create search object and add search providers
	var search = scopes.svySearch.createSimpleSearch(foundset);
	search.setSearchText(searchText);
	for(var i in searchProviders){
		search.addSearchProvider(searchProviders[i]);
	}
	
	//	execute search
	search.loadFoundSet(foundset);
	
}

/**
 * Basic search all columns in foundset data source
 * @properties={typeid:24,uuid:"EA41DEA7-7C3B-44BE-95B8-2D78014092D9"}
 */
function onSearch$basic(){
	scopes.svySearch.createSimpleSearch(foundset)
		.setSearchAllColumns()
		.setSearchText(searchText)
		.loadFoundSet(foundset);
}

/**
 * Add a search provider which is case-INsensitive
 * @properties={typeid:24,uuid:"57A5BF3B-69C3-4661-AE77-185EFC21AAB8"}
 */
function onSearch$caseInsensitive(){

	var search = scopes.svySearch.createSimpleSearch(foundset)
		.setSearchText(searchText);
	
	var searchProvider = search.addSearchProvider('shipcountry');
	searchProvider.setCaseSensitive(false);
}

/**
 * Add a search provider which is explicit-only
 * The user must enter the alias or the provider is omitted from the search
 * @example ordered:01/10/1997
 * @properties={typeid:24,uuid:"C57969AD-3BAB-486F-B9CD-4ED2461332C0"}
 */
function onSearch$explicit$dateFormat()
{
	var search = scopes.svySearch.createSimpleSearch(foundset)
		.setSearchText(searchText);
	
	search.addSearchProvider('orderdate')
		.setAlias('ordered')			//	specify the alias which may be used	
		.setImpliedSearch(false)		//	specify that the column is not searched unless explicitly specified
		.setDateFormat('MM/dd/yyyy');	//	Set the date format which is used

	search.loadRecords(foundset);
}