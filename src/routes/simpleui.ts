import express from "express";
import { validateJwt } from "./auth_aad.js";

const simpleui = express.Router()  
.get('/',  validateJwt, (req, res) => {
        res.send(`<!DOCTYPE html> 
        <html lang="en">
        
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content=
                "width=device-width, initial-scale=1.0">
            <meta http-equiv="X-UA-Compatible"
                    content="ie=edge">
            <title>PUT Request</title>
        </head>
        
        <body>
            <h1>
                Simple Feature Flag change...
            </h1>
            <form name="namespaceform" action="javascript:listflags()">
                <label for="appname"> Application Namespace: </label> <input type="text" name="appname">             <button type="submit" formaction="javascript:listflags()">list all flags</button>
            </form>
            <br>            
            <div  id="flags" > </div>     
            <br>
            <hr>
            <form name="featureform" action="javascript:update()">
                <label for="featurename">Add/Edit feature </label> <input type="text" name="featurename" > 
                <label for="onoff"> set </label> <input type="number" id="percentage" title="Optional, default equal to 100" value="" name="percentage" min="0" max="100">
                <label for="onoff">% of sessions to </label> 
                <select name="onoff" id="onoff">
                  <option value="True">On</option>
                  <option value="False">Off</option>
                </select> 
                <input name="Submit"  type="submit" value="Update"/><br>
                <span style='color:red;margin-right:25em; display:inline-block;'>&nbsp;</span>
                <button type="submit" formaction="javascript:addrollout()"> + Audience Specific toggle </button>
            </form>
            <form name="rolloutsform">
            <input type="hidden" name="rollout_count" value="0"> 
            <div id="rollouts" > </div>
            </form>
            <div id="last_update"> </div>


            <!-- Including library.js and app.js -->
            <script >
            class EasyHTTP {
                async put(url, data) {
                    try {
                        const response = await fetch(url, {
                                method: 'PUT',
                                headers: {
                                'Content-type': 'application/json',
                                },
                                body: JSON.stringify(data)
                        });
                        const resData = await response.json();
                        return resData;
                    } catch (err) {
                        console.log(err)
                    }
                }
                async delete(url) {
                    try {
                        const response = await fetch(url, {
                            method: 'DELETE',
                            headers: {
                            'Content-type': 'application/json',
                            },
                            body: null
                        });
                        const resData = await response;
                        console.log("deleting fetch returned:" + resData.status);
                        if (resData.status == 404) {
                            return "delete failed, flag not found.";
                        }
                        if (resData.status == 204 ) {
                            return "Delete successful.";
                        }
                        return resData;
                    } catch (err) {
                        console.log("deleting ERROR: " + err);    
                    }
                }
                async get(url) {
                    const response = await fetch(url, {
                        method: 'GET',
                        headers: {
                            'Content-type': 'application/json'
                        }
                    });
                    const resData = await response.json();
                    return resData;
                }
            }
            function addrollout (trait_i = "", value_i = "False", percentage_i = "") {
                let number = Number(document.rolloutsform.rollout_count.value) + 1;
                var container = document.getElementById("rollouts");
                ////remove children in the container if needed
                //while (container.hasChildNodes()) {
                //    container.removeChild(container.lastChild);
                container.appendChild(document.createTextNode("Audience " + (number) + " tag(s):" ));
                var input = document.createElement("input");
                input.type = "text";
                input.width = "25%";
                input.id = "traits" + (number);
                input.value=trait_i;
                container.appendChild(input);
                var input = document.createElement("input");
                input.type = "number";
                input.min = 0;
                input.max = 100; 
                input.value = percentage_i;
                input.id = "percentage" + (number);
                container.appendChild(input);
                var select = document.createElement("select");
                select.id = "value" + (number);
                var option1 = document.createElement("option");
                option1.text = "On";
                option1.value = "True";
                select.appendChild(option1);
                var option2 = document.createElement("option");
                option2.text = "Off";
                option2.value = "False";
                select.appendChild(option2);
                select.value=value_i;
                container.appendChild(select);
                container.appendChild(document.createElement("br"));
                document.rolloutsform.rollout_count.value = number;
            }
            function editflag(flag) {
                document.rolloutsform.rollout_count.value = 0;
                let container = document.getElementById("rollouts");
                while (container.hasChildNodes()) {
                container.removeChild(container.firstChild);
                }
                document.featureform.onoff.value = flag.onoff;
                flag.rollout.forEach ( (item, index) => {
                    if (item.traits == null) {
                        document.featureform.percentage.value = item.percentage ?? "";
                        document.featureform.onoff.value = item.value ? "True" : "False";
                    } else {
                        addrollout(item.traits, item.value ? "True" : "False", item.percentage ?? "")
                    }
                })
            }
            function listflags() {
                const http = new EasyHTTP;
                const appname = document.namespaceform.appname.value;
                const URL = 'http://localhost:3000/flags/' + appname  ;
                http.get(URL)
                .then (data => {
                    let text ="" ;
                    data.forEach ((flag, index) => text += "<hr> <form name='feature" + index + "'> <b>" + flag.name + "</b> " + "<button type='submit' formaction='javascript:editflag(" + JSON.stringify(flag) + ")'> edit </button> <button style='color:red'  type='submit' formaction='javascript:deleteflag(\\"" + flag.name + "\\")'> DELETE </button> <br> &nbsp &nbsp" + flag.rollout.reduce((result,item)=> {return result + "<br> &nbsp  &nbsp" + JSON.stringify(item) },"") + "</form> <br>");
                    document.getElementById("flags").innerHTML = text;
                    //document.getElementById("flags").innerHTML = JSON.stringify(data).replaceAll('},', "},  <br>&nbsp")
                })
                .catch(err => console.log(err));
            }
            function deleteflag(feature_name) {
                const http = new EasyHTTP;
                const onoff = document.featureform.onoff.value === "True" ;
                const appname = document.namespaceform.appname.value;
                const featurename = feature_name ?? document.featureform.featurename.value;
                    if (confirm("Are you SURE you want to delete " + appname + "/" + featurename +"?") == true) {
                        const URL = 'http://localhost:3000/flags/' + appname + '/' + featurename ;
                    http.delete(URL)
                    .then(data => {
                        let text = "";
                        document.getElementById("last_update").innerHTML =  "deleting [" + featurename + "]..." + ((data == null )? "" : JSON.stringify(data))})
                    .catch(err => document.getElementById("last_update").innerHTML =  "Failed to delete [" + featurename + "]");
                }
            }

            function update() {
                const http = new EasyHTTP;
                const onoff = document.featureform.onoff.value === "True" ;
                const appname = document.namespaceform.appname.value;
                const featurename = document.featureform.featurename.value;
                const URL = 'http://localhost:3000/flags/' + appname + '/' + featurename ;
                // User Data
                const rollout = {
                     value: onoff 
                }
                const percentage = (document.featureform.percentage.value ?? 100)
                if ( percentage != "" ) {
                    rollout.percentage = Number(percentage)
                }
                let rollouts = [];
                const no_of_rollouts = Number(document.rolloutsform.rollout_count.value);
                for ( i = 1; i <= no_of_rollouts; i++ ) {
                    //let value=(document.getElementById("value" + i).value === "True"); 
                    let percentage=(document.getElementById("percentage" + i).value ); 
                    let traits=document.getElementById("traits" + i)?.value.split(",");

                    const rollout_n = {value: (document.getElementById("value" + i).value === "True")}
                    if ( traits !== "" && traits !== null ) {
                        rollout_n.traits = traits;
                    }
                    if ( percentage !== "" && percentage !== null ) {
                        rollout_n.percentage = Number(percentage);
                    }
                    rollouts.push(rollout_n)
                }
                const data = { rollout: [rollout, ...rollouts] }
                console.log(data, URL)

                http.put(URL, data)
                .then(data => {document.getElementById("last_update").innerHTML = JSON.stringify(data);
                    let container = document.getElementById("rollouts");
                    while (container.hasChildNodes()) {
                    container.removeChild(container.firstChild);
                    }
                    document.rolloutsform.rollout_count.value = 0;
                    document.featureform.featurename.value = "";
                    document.featureform.percentage.value = "";
                    document.featureform.onoff.value = "True";
                 })
                .catch(err => console.log(err));
            }
            
            </script>
        </body>
        
        </html>
        `);
});

export default simpleui;