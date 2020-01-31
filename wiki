Welcome to the **svySearch** wiki! This wiki provides comprehensive documentation to using the **svySearch** module. This module is designed to parse natural-language text input and apply it to developer-specified patterns for searching.

**Table of Contents**

* [Parsing Rules](#parsing-rules)
* [API Documentation](#api-documentation)
  - [svySearch Scope](#svysearch)
  - [SimpleSearch Class](#simplesearch)
  - [SearchProvider Class](#searchprovider)


## Parsing Rules
Text is parsed according to some general patterns. String fragments are matched against developer-specified [SearchProvider](#searchprovider), which map some rules to how certain columns are searched.

**Patterns**

* [Tokens](#tokens): Parsing input for individual words
* [Quoted Strings](#quoted-strings): Used to escape token separators
* [Aliases](#aliases): Used to explicitly referenes a single [SearchProvider](#searchprovider)
* [Operators](#operators): For comparisons other than the default LIKE/Contains
* [Substitutions](#substitutions): Dynamically match and replace input text, ideal for converting value list values into stored values

### Tokens
---
Words separated by white space will be treated as separate tokens. ALL tokens must match ANY [SearchProvider](#searchprovider).

**Example**
```
John Smith // matches "John Smith", "Smithers Johnson", "John Doe" at "Smithefield Road", etc
```

**NOTE**: _Multiple tokens that match on the same **related** SearchProvider are not currently supported and may result in no records. This cannot be easily supported, because when a SearchProvider is compared to multiple tokens, we cannot know which token(s) matched, and therefore, cannot guarantee the contract for matching ALL tokens._

### Quoted Strings
---
Use double quotes to escape tokenization

**Example**
```
"John Smith" // matches only "John Smith" and not "Smithers Johnson", "John Doe" at "Smithefield Road", etc
```

### Aliases
---
Any [SearchProvider](#searchprovider) can be explicitly searched using the data provider name or alias. Aliases are specified left or a ':' character. Additionally, some [SearchProvider](#searchprovider) can be specified as explicit-only, meaning the field is not searched unless the user performs an alias-based search. This can be useful for date fields

**Example**
```
last-name:smith // matches "John Smith", but not John Doe at "Smithefield Road", etc.
```

### Operators
---
By default, all searches are LIKE/Contains for Strings and strict "=" for Numbers and Dates. However, additional operators may be specified at the beginning of a token (except for the BETWEEN operator)

Operator | Name | Summary
-------- | ---- | -------
\- | Exclude | Excludes the token from the search using a NOT LIKE for Strings and NOT EQUAL for Numbers and Dates
\+ | Exact | Performs an exact match in lieu of a LIKE
\> | Greater-Than | Matches all values greater than the specified token
\>= | Greater-Than-Or-Equal | Matches all values greater than or equal to the specified token
\< | Less-Than | Matches all values less than the specified token
\<= | Less-Than-Or-Equal | Matches all values less than or equal to the specified token
\... | Between | Matches all values between the two operands

**Example**
```
john -smith   // matches "John Doe" and "Suxy Johnson" but not "John Smith"
+john         // matches "John Doe", but not "Suzy Johnson"
freight:>100  // matches any freight greater than $100
freight:>=100 // matches any freight greater or equal to $100
order-date:<01-01-1997  // matches any date less than 01-01-1997
order-date:<=01-01-1997  // matches any date less than or equal to 01-01-1997
order-date:01-01-1997...12-31-1997  // matches any date during the year of 1997
```

### Substitutions
---

Substitutions can be applied dynamically to match and replace string fragments within user input. This is ideal for allowing users to express custom ValueList display values in their searches, and have those values resolved to the actual stored/DB value

**Example**
```
user-type:admin // where "admin" is substituted to some stored value, for example "1"
```


# API Documentation

**svySearch** is an object-oriented API for parsing user input and applying searches against the data model.

The API consists of the primary class [SimpleSearch](#simplesearch), which models a search on a particular data source and its supporting class, [SearchProvider](#searchprovider), which models th ecomponent of the search that maps to a single data provider.

**Example**

```
//	create the search object
var search = scopes.svySearch.createSimpleSearch(foundset);

//	add some data providers
search.addSearchProvider('shipcity');

//	add related data providers
search.addSearchProvider('orders_to_customers.companyname');
search.addSearchProvider('orders_to_order_details.order_details_to_products.productname');

//	add an explicit search provider
search.addSearchProvider('orderdate')
	.setAlias('date')
	.setImpliedSearch(false);
	
//	set user input
search.setSearchText('germany ordered:01/01/1996');

//	execute search in existing foundset
search.loadRecords(foundset);
```


# svySearch
A single scope that contains the classes

## Method Summary

### createSimpleSearch
---

**Params**  

| Type | Name | Summary | Required
| ---- | ---- | ------- | --------
Number | **dataSource** | The data source used | Required

**returns** 

[SimpleSearch](#simplesearch)

**example**

```
scopes.svySearch.createSimpleSearch(foundset);
scopes.svySearch.createSimpleSearch(record);
scopes.svySearch.createSimpleSearch('db:/example_data/orders');
```

# SimpleSearch
A class which models a search on a particular data source and its supporting class

## Method Summary
Return Type | Method | Description
----------- | ------ | -----------
[SearchProvider](#searchprovider) | [**addSearchProvider**](#addsearchprovider) | Adds a dataprovider to the search object.
[Array](https://wiki.servoy.com/display/DOCS/Array)\<[SearchProvider](#searchprovider)\> | [**getAllSearchProviders**](#getallsearchproviders) | Get all search providers for this search object
[JSDataSet](https://wiki.servoy.com/display/DOCS/JSDataSet) | [**getDataSet**](#getdataset) | Executes the search and returns the results as a [JSDataSet](https://wiki.servoy.com/display/DOCS/JSDataSet)
[String](https://wiki.servoy.com/display/DOCS/String) | [**getDataSource**](#getdatasource) | Returns the data source used by the search object
[String](https://wiki.servoy.com/display/DOCS/String) | [**getDateFormat**](#getdateformat) | Returns the date format which is used to parse user input for searching dates
[JSFoundSet](https://wiki.servoy.com/display/DOCS/JSFoundSet) | [**getFoundSet**](#getfoundset) | Creates a factory foundset, runs the search and returns it
[QBSelect](https://wiki.servoy.com/display/DOCS/QBSelect) | [**getQuery**](#getquery) | Creates and returns a query object parsed from the user input
[SearchProvider](#searchprovider) | [**getSearchProvider**](#getsearchprovider) | Gets a [SearchProvider](#searchprovider) by specified name (alias)
[String](https://wiki.servoy.com/display/DOCS/String) | [**getSearchText**](#getsearchtext) | Gets the raw, unparsed input text
[Boolean](https://wiki.servoy.com/display/DOCS/Boolean) | [**loadRecords**](#loadrecords) | Loads records on the specified foundset.
[SimpleSearch](#simplesearch) | [**setDateFormat**](#setdateformat) | Sets the date formatting which will be used to parse user input
[SimpleSearch](#simplesearch) | [**setSearchAllColumns**](#setsearchallcolumns) | Sets that all columns are to be searchable
[SimpleSearch](#simplesearch) | [**setSearchText**](#setsearchtext) | Set the raw, user input to be parsed

## Method Details

### addSearchProvider
---
Adds a search provider to the search object. 

**Params**  

| Type | Name | Summary | Required
| ---- | ---- | ------- | --------
[String](https://wiki.servoy.com/display/DOCS/String) | **dataProviderID** | The data provider that will be searched. Can be columns, related columns | **Required**
[String](https://wiki.servoy.com/display/DOCS/String) | **alias** | The natural language name of the search provider. Used in explicit searches. | Optional. Default is same as data provider
[Boolean](https://wiki.servoy.com/display/DOCS/Boolean) | **impliedSearch** | Set this false to indicate that a provider is not searchable unless explicitly referenced | Optional. Default is True
[Boolean](https://wiki.servoy.com/display/DOCS/Boolean) | **caseSensitive** | Set this to be true to force case-sensitive search on this search provider | Optional. Default is False

**Returns** 
    [SearchProvider](#searchprovider)

### getAllSearchProviders
---
Get all search providers for this search object

**Returns** 
    [Array](https://wiki.servoy.com/display/DOCS/Array)\<[SearchProvider](#searchprovider)\>

### getDataSet 
---
Executes the search and returns the results as a [JSDataSet](https://wiki.servoy.com/display/DOCS/JSDataSet)

**Params**  

| Type | Name | Summary | Required
| ---- | ---- | ------- | --------
Number | **maxRows** | The max rows to retrieve | Optional. Default is -1 (unlimited)

**Returns** 
    [JSDataSet](https://wiki.servoy.com/display/DOCS/JSDataSet)

### getDataSource 
---
Returns the data source used by the search object

**Returns** 
    [String](https://wiki.servoy.com/display/DOCS/String)
	
### getDateFormat 
---
Returns the date format which is used to parse user input for searching dates

**Returns** 
    [String](https://wiki.servoy.com/display/DOCS/String)
	
### getFoundSet
---
Creates a factory foundset, runs the search and returns it

**Returns** 
    [JSFoundSet](https://wiki.servoy.com/display/DOCS/JSFoundSet)
	
### getQuery
---
Creates and returns a query object parsed from the user input

**Returns** 
    [QBSelect](https://wiki.servoy.com/display/DOCS/QBSelect)

### getSearchProvider
---
Gets the specified [SearchProvider](#searchprovider)

**Params**  

| Type | Name | Summary | Required
| ---- | ---- | ------- | --------
[String](https://wiki.servoy.com/display/DOCS/String) | **aliasOrDataProvider** | The name or alias of the data provider | Required

**Returns** 
    [SearchProvider](#searchprovider) or null if named [SearchProvider](#searchprovider) is not found

### getSearchText
---
Gets the raw, unparsed input text

**Returns** 
    [String](https://wiki.servoy.com/display/DOCS/String)

### loadRecords
---
Loads records in the specified foundset

**Params**  

| Type | Name | Summary | Required
| ---- | ---- | ------- | --------
[JSFoundSet](https://wiki.servoy.com/display/DOCS/JSFoundSet) | **foundSet** | The [JSFoundSet](https://wiki.servoy.com/display/DOCS/JSFoundSet) object upon which to load records | Required	
	
**Returns** 
    [Boolean](https://wiki.servoy.com/display/DOCS/Boolean) True indicates query was successful, although may have loaded zero records	
	
### setDateFormat
---
Sets the date formatting which will be used to parse user input

**Params** 

| Type | Name | Summary | Required
| ---- | ---- | ------- | --------
[String](https://wiki.servoy.com/display/DOCS/String) | **format** | The format to use for date searches | Required	

**Returns** 
    [SimpleSearch](#simplesearch) Returns this [SimpleSearch](#simplesearch) for convenience, method chaining

### setSearchAllColumns
---
Sets that all columns are to be searchable

This should be called **before** adding any additional, related search providers	
	
**Returns** 
    [SimpleSearch](#simplesearch) Returns this [SimpleSearch](#simplesearch) for convenience, method chaining
	
### setSearchText
---
Set the raw, user input to be parsed

**Params** 

| Type | Name | Summary | Required
| ---- | ---- | ------- | --------
[String](https://wiki.servoy.com/display/DOCS/String) | **searchText** | The raw text to be parsed | Required		
	
**Returns** 
    [SimpleSearch](#simplesearch) Returns this [SimpleSearch](#simplesearch) for convenience, method chaining
	
	
# [SearchProvider](#searchprovider)
A class which models the component of the search that maps to a single data provider.

## Method Summary
Return Type | Method | Description
----------- | ------ | -----------
[SearchProvider](#searchprovider) | [**addSubstitution**](#addsubstitution) | Add a substitution kev-value pair to this search provider
[String](https://wiki.servoy.com/display/DOCS/String) | [**getAlias**](#getAlias) | Gets the alias of this search provider.
[String](https://wiki.servoy.com/display/DOCS/String) | [**getDataProviderID**](#getdataproviderid) | Gets the data provider ID
JSColumn | [**getJSColumn**](#getjscolumn) | Get the JSColumn object that corresponds to this search provider
JSTable | [**getJSTable**](#getjstable) | Get the JSTable object that corresponds to this search provider
[String](https://wiki.servoy.com/display/DOCS/String) | [**getStringMatching**](#getstringmatching) | gets the String matching mode for this [SearchProvider](#searchprovider)
[Array](https://wiki.servoy.com/display/DOCS/Array)\<[String](https://wiki.servoy.com/display/DOCS/String)\> | [**getSubstitutionsKeys**](#getsubstitutionskeys) | Get all the keys for substitutions
[String](https://wiki.servoy.com/display/DOCS/String) | [**getSubstitutionValue**](#getsubstitutionvalue) | Get the substitution value for a given key
[Boolean](https://wiki.servoy.com/display/DOCS/Boolean) | [**isCaseSensitive**](#iscasesensitive) | Indicates if this [SearchProvider](#searchprovider) is case-sensitive
[Boolean](https://wiki.servoy.com/display/DOCS/Boolean) | [**isImpliedSearch**](#isimpliedsearch) | Indicates if this [SearchProvider](#searchprovider) is an implied search
[SearchProvider](#searchprovider) | [**setAlias**](#setalias) | Sets the natural language name for this [SearchProvider](#searchprovider)
[SearchProvider](#searchprovider) | [**setCaseSensitive**](#setcasesensitive) | Specifies if this [SearchProvider](#searchprovider) will perform case-sensitive searches
[SearchProvider](#searchprovider) | [**setImpliedSearch**](#setimpliedsearch) | Specifies if this search provider is included in implied search
[SearchProvider](#searchprovider) | [**setStringMatching**](#setstringmatching) | Sets the String matching mode for this [SearchProvider](#searchprovider)
## Method Details

### addSubstitution	
---
Add a substitution kev-value pair to this search provider

Substitutions provide replacement capability for user input.

A typical use case involves parsing a value list display value

**Params** 

| Type | Name | Summary | Required
| ---- | ---- | ------- | --------
[String](https://wiki.servoy.com/display/DOCS/String) | **key** | A string to be replaced | Required	
[String](https://wiki.servoy.com/display/DOCS/String) | **value** | The value to replace it with | Required
	
**Returns** 
    [SearchProvider](#searchprovider) this [SearchProvider](#searchprovider) for convenience, method chaining
	
### getAlias	
---
Gets the alias of this search provider.

**Returns** 
    [String](https://wiki.servoy.com/display/DOCS/String) The alias, or null if none was specified

### getDataProviderID	
---
Gets the data provider ID

**Returns** 
    [String](https://wiki.servoy.com/display/DOCS/String) The data provider which will be searched
	
### getJSColumn	
---
Get the JSColumn object that corresponds to this search provider

**Returns** 
    JSColumn


### getJSTable	
---
Get the JSTable object that corresponds to this search provider

**Returns** 
    JSTable

### getStringMatching	
---
Get the matching mode for this search provider.

**Returns** 
    [String](https://wiki.servoy.com/display/DOCS/String)

### getSubstitutionsKeys	
---
Get all the keys for substitutions

**Returns** 
    [Array](https://wiki.servoy.com/display/DOCS/Array)<[String](https://wiki.servoy.com/display/DOCS/String)>

### getSubstitutionValue	
---
Get the substitution value for a given key

**Params**

| Type | Name | Summary | Required
| ---- | ---- | ------- | --------
[String](https://wiki.servoy.com/display/DOCS/String) | **key** | The substitution key | Required	

**Returns** 
    [String](https://wiki.servoy.com/display/DOCS/String)


### isCaseSensitive	
---
Indicates if this [SearchProvider](#searchprovider) is case-sensitive

**Returns** 
    [Boolean](https://wiki.servoy.com/display/DOCS/Boolean)

### isImpliedSearch	
---
Indicates if this [SearchProvider](#searchprovider) is an implied search

**Returns** 
    [Boolean](https://wiki.servoy.com/display/DOCS/Boolean)

### setAlias	
---
Sets the natural language name for this [SearchProvider](#searchprovider)

The alias can be used in explicit searches

**Params**

| Type | Name | Summary | Required
| ---- | ---- | ------- | --------
[String](https://wiki.servoy.com/display/DOCS/String) | **alias** | The alias | Required	

**Returns** 
    [SearchProvider](#searchprovider) this [SearchProvider](#searchprovider) for convenience, method chaining

### setCaseSensitive	
---
Specifies if this [SearchProvider](#searchprovider) will perform case-sensitive searches

**Params**

| Type | Name | Summary | Required
| ---- | ---- | ------- | --------
[Boolean](https://wiki.servoy.com/display/DOCS/Boolean) | **caseSensitive** | The value for case-sensitive | Required	

**Returns** 
    [SearchProvider](#searchprovider) this [SearchProvider](#searchprovider) for convenience, method chaining

### setImpliedSearch	
---
Specifies if this search provider is included in implied search

A value of **true** indicates that the provider will always be searched

A value of **false** indicates that provider will ONLY be searched when used in explicit field matching

**Params**

| Type | Name | Summary | Required
| ---- | ---- | ------- | --------
[Boolean](https://wiki.servoy.com/display/DOCS/Boolean) | **impliedSearch** | The value for implied search | Required	

**Returns** 
    [SearchProvider](#searchprovider) this [SearchProvider](#searchprovider) for convenience, method chaining

### setStringMatching	
---
Sets the string matching mode for this SearchProvider

**Params**

| Type | Name | Summary | Required
| ---- | ---- | ------- | --------
[String](https://wiki.servoy.com/display/DOCS/String) | **stringMatching** | The desired matching mode | Required	

**Returns** 
    [SearchProvider](#searchprovider) this [SearchProvider](#searchprovider) for convenience, method chaining
