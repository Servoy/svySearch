
/**
 *
 * @return {String}
 *
 * @properties={typeid:24,uuid:"8FB72CB2-B0F6-478B-8181-F04A9019D7C2"}
 */
function getName() {
	return 'Text Searching';
}

/**
*
* @return {String}
*
* @properties={typeid:24,uuid:"81E9B231-CCE3-415F-A438-C9F614CE6811"}
*/
function getDescription() {
	return 'Google-Like Text Searching for Business Applications';
}

/**
*
* @return {String} Download URL
*
* @properties={typeid:24,uuid:"B9E0C1BB-7447-4A6B-9655-997A142F2ED0"}
*/
function getDownloadURL() {
	return 'https://github.com/Servoy/svySearch/releases/download/v1.1.0/svySearch.servoy';
}

/**
*
* @return {String}
*
* @properties={typeid:24,uuid:"9601374F-62B0-447C-B298-4C221BBB15D0"}
*/
function getIconStyleClass() {
	return 'fa fa-search';
}

/**
*
* @return {String} Additioanl info (wiki markdown supported)
*
* @properties={typeid:24,uuid:"399F1B4B-B178-4776-AAE4-724B3EE0C169"}
*/
function getMoreInfo() {
	var url = 'https://raw.githubusercontent.com/Servoy/svySearch/master/README.md';
	return plugins.http.getPageData(url);
}

/**
*
* @return {Array<String>} code lines
*
* @properties={typeid:24,uuid:"0761F36F-8708-464D-B29D-04BF5DB13AB9"}
*/
function getSampleCode() {
	return printMethodCode(forms.ordersList.onSearch);
}

/**
 * Callback method when form is (re)loaded.
 *
 * @param {JSEvent} event the event that triggered the action
 *
 * @private
 *
 * @properties={typeid:24,uuid:"F6F78DAC-1600-4488-8941-EEA76F6CA656"}
 */
function onLoad(event) {
	// set divider location
	elements.tabs.dividerLocation = 600;
	
	elements.tabs.leftFormMinSize = 400;
}


/**
*
* @return {String} Website URL
*
* @properties={typeid:24,uuid:"1F6D79CB-D4A1-4797-940E-4AB43B5377F0"}
*/
function getWebSiteURL() {
	return 'https://github.com/Servoy/svySearch';
}

/**
 *
 * @return {RuntimeForm<AbstractMicroSample>}
 *
 * @properties={typeid:24,uuid:"9CCEDD1F-E7B4-4EE5-B90D-2C78133FF953"}
 */
function getParent() {
	return forms.extensionSamples;
}
