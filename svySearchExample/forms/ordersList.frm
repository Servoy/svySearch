customProperties:"formComponent:false",
dataSource:"db:/example_data/orders",
encapsulation:60,
items:[
{
anchors:11,
displaysTags:true,
location:"0,60",
size:"440,26",
styleClass:"info",
text:"Matching order records: <b>%%count_orders%%<\/b>",
transparent:true,
typeid:7,
uuid:"040F31F2-69F8-4D80-988D-B0DF0EAF8CC1"
},
{
height:95,
partType:1,
typeid:19,
uuid:"15325D93-2652-45B2-BF17-F66EB6DB1B9A"
},
{
anchors:11,
labelFor:"companyname",
location:"0,100",
name:"companyname_label",
size:"160,20",
text:"Customer",
transparent:true,
typeid:7,
uuid:"1CD82C4E-4B51-4FB0-85F8-0039FEE628FC"
},
{
anchors:11,
dataProviderID:"searchText",
location:"0,20",
name:"searchText",
onActionMethodID:"E235968B-143E-4209-B89C-267F6305B66C",
placeholderText:"Enter Search Criteria",
size:"440,40",
styleClass:"search",
typeid:4,
uuid:"2077607F-22C9-4A8D-BE44-6D8AC721ED8D"
},
{
anchors:11,
dataProviderID:"shipcountry",
location:"300,120",
name:"shipcountry",
size:"140,30",
transparent:true,
typeid:7,
uuid:"5FE2128D-16E2-46EF-8D4A-281C38D8EBFF"
},
{
height:160,
partType:5,
typeid:19,
uuid:"65DD93EC-CED2-4983-8E66-86B3C85EF0A0"
},
{
anchors:11,
dataProviderID:"orderdate",
format:"MM/dd/yyyy",
location:"160,120",
name:"orderdate",
size:"140,30",
transparent:true,
typeid:7,
uuid:"A5863E9C-A1C0-4D68-9A4C-9BBB6CD2CCDF"
},
{
anchors:11,
labelFor:"orderdate",
location:"160,100",
name:"orderdate_label",
size:"140,20",
text:"Date",
transparent:true,
typeid:7,
uuid:"A82BA96B-F08F-4B42-9ED6-5C72B76BD488"
},
{
anchors:11,
labelFor:"shipcountry",
location:"300,100",
name:"shipcountry_label",
size:"140,20",
text:"Shipcountry",
transparent:true,
typeid:7,
uuid:"A99F9142-1328-41C8-B161-9D991B0A49D8"
},
{
anchors:3,
location:"400,20",
size:"40,40",
styleClass:"search-icon",
text:"<span class=\"fa fa-search\"/>",
transparent:true,
typeid:7,
uuid:"B0FA84E8-9F9D-414C-9AA9-2B2CF041294F"
},
{
anchors:11,
dataProviderID:"orders_to_customers.companyname",
location:"0,120",
name:"companyname",
size:"160,30",
transparent:true,
typeid:7,
uuid:"F0050596-7277-423B-99F9-8D10A954100E"
}
],
name:"ordersList",
navigatorID:"-1",
scrollbars:32,
showInMenu:true,
size:"440,160",
typeid:3,
uuid:"3B72E186-6C19-402A-873F-84922F823320",
view:3