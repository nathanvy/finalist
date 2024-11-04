"use strict";

// yes it's all one giant file fight me

const config = {
    domain: 'finalist.0x85.org',
    path: '/api/'
};
const endPoint = `https://${config.domain}${config.path}`;

const routes = [
    {
        path: '/',
        callback: renderListOverview
    },
    {
        path: '/login',
        callback: renderLoginForm
    },
    {
        path: '/logout',
        callback: doLogout
    },
    {
        path: '/about',
        callback: renderAboutPage
    },
    {
        path: '/list/:id',
        callback: (params) => { return renderListContents(params.id); }
    },
    {
        path: '/list/:id/listsettings',
        callback: (params) => { return renderListSettingsPage(params.id); }
    }
];

async function doLogout(){
    const s = `https://${config.domain}/pubapi/logout`;
    await fetch(s, {
        method: 'GET',
    })
        .then((response) => {
            if(response.bodyUsed){
                const j = response.json();
                return j;
            }
            else {
                return new Object();
            }
        })
        .then(() => {
            window.history.pushState({}, '', '/');
            handleLocation();
        })
}

async function renderLogoutButton() {
    //where e is the target element
    const logoutlink = document.createElement('a');
    logoutlink.href = "/logout";
    logoutlink.id = "logout-btn";
    logoutlink.innerText = "Logout";
    const navbar = document.getElementById('nav');
    const hamburger = document.getElementById("#hamburger");
    navbar.insertBefore(logoutlink, hamburger);
}

async function renderListSettingsLink() {
    const hamburger = document.getElementById("#hamburger");
    const settingslink = document.createElement('a');
    settingslink.href = "/list/6/listsettings";
    settingslink.id = "list-settings-btn";
    settingslink.innerText = "List Settings";
    navbar.insertBefore(settingslink, hamburger);
}

function clearAndReRender(target) {
    target.replaceChildren();

    //collapse navbar if expanded
    var x = document.getElementById("nav");
    x.className = "";
        
    const checkedlink = document.getElementById("remove-checked-btn");
    if (checkedlink != null) {
        checkedlink.remove();
    }
    
    const backlink = document.getElementById("back-btn");
    if (backlink != null) {
        backlink.remove();
    }
    
    const logoutlink = document.getElementById("logout-btn");
    if (logoutlink != null) {
        logoutlink.remove();
    }
    
    const settingsLink = document.getElementById("list-settings-btn");
    if (settingsLink != null) {
        settingsLink.remove();
    }
}

async function renderAboutPage(){
    const target = document.getElementById("main");
    clearAndReRender(target);
    const s = `${endPoint}about`;
    const fetchresponse = await fetch(s, {
        method: 'GET',
    });
    if( fetchresponse.headers.get("X-Logged-In") === "true" ){
        await renderLogoutButton();
    }
    const resp = await fetchresponse.json();
    const ver = resp.payload;
    const para = document.createElement('p');
    para.innerText = `Welcome to Finalist ${ver}, the final list app you'll ever need.`;
    const hthree = document.createElement('h3');
    hthree.innerText = "Pro Tip";
    const protips = document.createElement('p');
    protips.innerText = "On mobile, when you are viewing the contents of a list, you can swipe left or right to cross-out that item.  Swiping again un-crosses it out.";
    target.append(para, hthree, protips);
}

async function fetchListContents(id) {
    const s = `${endPoint}list/${id}`;
    const fetchresponse = await fetch(s, {
        method: 'GET',
    });
    if( fetchresponse.headers.get("X-Logged-In") === "true" ){
        await renderLogoutButton();
    }
    const resp = await fetchresponse.json();
    return resp;
}

async function fetchListsByUser() {
    const s = `${endPoint}listview`;
    const resp = await fetch(s, {
        method: 'GET',
    })
        .then(response => {
            if( response.headers.get("X-Logged-In") === "true" ){
                renderLogoutButton();
            }
            
            return response.json();
            
        })

    return resp;
}

async function fetchUsers(id) {
    const s = `${endPoint}listusers/${id}`;
    const fetchresponse = await fetch( s, {
        method: 'GET',
    });
    if( fetchresponse. headers.get("X-Logged-In") === "true"){
        await renderLogoutButton();
    }
    const resp = await fetchresponse.json();
    return resp;
}

async function toggleStrikeThru(elem) {
    elem.classList.toggle('strike');
}

async function saveLineItem(id) {
    toggleEditLineItem(id);
    var pathsegments = window.location.pathname.split("/"); //remember segments[0] will always be ""
    var listid = pathsegments[2];
    var payload = new Object();
    var paras = document.getElementById(id).getElementsByTagName('p');
    payload.payload = paras[0].innerText;

    const uri = `${endPoint}list/${listid}/update/${id}`;
    await fetch(uri, {
        "headers": {
            'Accept': 'application/json, text/plain',
            'Content-Type': 'application/json'
        },
        "method": "POST",
        "body": JSON.stringify(payload)
    });
    // figure out how to show a response modal here if this actually works
}

async function resetLineItem(id) {
    toggleEditLineItem(id)
}

async function deleteLineItem(id) {
    makeConfirmModal(id);
}

async function makeConfirmModal(id) {
    const parent = document.getElementById(id);
    const modal = document.createElement('div');
    modal.classList.add('modal');
    modal.id = "confirm-delete-modal";

    const modalcontent = document.createElement('div');
    modalcontent.classList.add('modal-content');
    const text = document.createElement('p');
    text.innerText = "Actually delete?";

    const yesbtn = document.createElement('button');
    yesbtn.setAttribute('type', 'button');
    yesbtn.addEventListener('click', (e) => {
        e.preventDefault();
        return actuallyDeleteLineItem(parent);
    }, false);
    yesbtn.innerText = "Yes";
    
    const nobtn = document.createElement('button');
    nobtn.setAttribute('type', 'button');
    nobtn.addEventListener('click', (e) => {
        e.preventDefault();
        return removeModal(modal);
    }, false);
    nobtn.innerText = "No";

    const frag = new DocumentFragment();
    frag.append(modal);
    modal.append(text, yesbtn, nobtn);
    
    parent.appendChild(frag);

}

async function removeModal(modaldiv) {
    modaldiv.replaceChildren();
    modaldiv.remove();
}

async function actuallyDeleteLineItem(elem) {
    var pathsegments = window.location.pathname.split("/");
    var listid = pathsegments[2];
    var payload = new Object();
    payload.id = elem.id;

    const uri = `${endPoint}list/${listid}/delete/${elem.id}`;
    const resp = await fetch(uri, {
        "headers": {
            'Accept': 'application/json, text/plain',
            'Content-Type': 'application/json'
        },
        "method": "GET"
    });
    const jsonresponse = await resp.json();
    if( jsonresponse.success ) {
        if(document.contains(elem)){
            elem.remove();
        }
        else {
            console.log("document does not contain!");
        }
    }
    else {
        var frag = new DocumentFragment();
        const d = document.createElement('div');
        const p = document.createElement('p');
        d.classList.add('errormsg');
        p.innerText = jsonresponse.error;
        d.appendChild(p);
        frag.appendChild(d);
        const parent = document.getElementById('main');
        parent.prepend(frag);
        
        setTimeout(() => {
            if (d) {
                d.remove();
            }
        }, 5000);
    }
}

async function removeCheckedItems(e){
    e.preventDefault();
    e.stopPropagation();
    //const maindiv = document.getElementById("main");
    document.querySelectorAll('p.strike').forEach( async (para) => {
        // Find the parent div element (assumes the checkbox is inside a div)
        const parentDiv = para.closest('div');
        if (parentDiv) {
            await actuallyDeleteLineItem(parentDiv);
        }
    });

    await togglenav();
    return false;
}

function setEndOfContenteditable(contentEditableElement) {
    var range, selection;
    range = document.createRange();
    range.selectNodeContents(contentEditableElement);
    range.collapse(false);
    selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
}

async function toggleEditLineItem(id) {
    const parent = document.getElementById(id);
    const children = parent.getElementsByTagName('p');
    const para = children[0];

    if (para) {
        //if a <p> tag exists then swap it to be an input field and create the buttons
        var frag = new DocumentFragment();
        const contents = para.innerText;
        const editable = document.createElement('input');
        editable.type = "text";
        
        const hr = document.createElement('hr');
        const savebtn = document.createElement('button');
        savebtn.setAttribute('type', 'button');
        savebtn.addEventListener('click', (e) => {
            e.preventDefault();
            saveLineItem(id);
        }, false);
        savebtn.innerText = "Save";

        const cancelbtn = document.createElement('button');
        cancelbtn.setAttribute('type', 'button');
        cancelbtn.addEventListener('click', (e) => {
            e.preventDefault();
            resetLineItem(id);
        }, false);
        cancelbtn.innerText = "Cancel";

        const delbtn = document.createElement('button');
        delbtn.setAttribute('type', 'button');
        delbtn.addEventListener('click', (e) => {
            e.preventDefault();
            deleteLineItem(id);
        }, false);
        delbtn.innerText = "Delete Item";
        frag.append(editable, hr, savebtn, cancelbtn, delbtn);
        para.replaceWith(frag);
        editable.value = contents;
        editable.focus();
    }
    else {
        // para was null so there's no paragraph
        const input = parent.getElementsByTagName('input')[0];
        const contents = input.value;
        const para = document.createElement('p');
        para.innerText = contents;
        input.replaceWith(para);
        para.addEventListener('touchstart', handleTouchStart);
        para.addEventListener('touchend', handleTouchEnd);

        //we've removed the previous input so this is the only one
        const check = parent.getElementsByTagName('input')[0]; 
        const cb = document.createElement('input');
        cb.type = "checkbox";
        check.replaceWith(cb);
        cb.addEventListener('change', function () { toggleStrikeThru(para); });

        const buttons = document.getElementById(id).getElementsByTagName('button');
        while (buttons.length > 0) {
            buttons[0].remove();
        }
        const hrs = document.getElementById(id).getElementsByTagName('hr');
        for (let hr of hrs) {
            hr.remove();
        }
    }
}

var xInitial = 0;

function handleTouchStart(e){
    e.preventDefault();
    xInitial = e.changedTouches[0].screenX;
}

function handleTouchEnd(e){
    e.preventDefault();
    var diff = Math.abs(e.changedTouches[0].screenX - xInitial);
    if (diff < 30){
        return;
    }
    toggleStrikeThru(e.target);
    return;
}

async function renderListContents(id) {
    const targetNode = document.getElementById("main");
    const navbar = document.getElementById("nav");
    clearAndReRender(targetNode);

    const hamburger = document.getElementById("#hamburger");
    const settingslink = document.createElement('a');
    settingslink.href = "/list/" + id + "/listsettings";
    settingslink.id = "list-settings-btn";
    settingslink.innerText = "List Settings";
    navbar.insertBefore(settingslink, hamburger);

    const removeCheckedLink = document.createElement('a');
    removeCheckedLink.addEventListener('click', removeCheckedItems);
    removeCheckedLink.id = "remove-checked-btn";
    removeCheckedLink.href = 'javascript:void(0)';
    removeCheckedLink.innerText = "Remove Checked";
    navbar.insertBefore(removeCheckedLink, hamburger);
    
    const items = await fetchListContents(id);
    if (items != null  && items.error) {
        window.history.pushState({}, '', '/login');
        handleLocation();
    }
    else if (items != null) {
        const frag = new DocumentFragment();
        items.forEach(item => {
            const container = document.createElement("div");
            container.classList.add("lineitem");
            container.id = item.itemid;
            const p = document.createElement("p");
            p.innerText = item.content;
            container.appendChild(p);
            const cb = document.createElement('input');
            cb.type = "checkbox";
            cb.addEventListener('change', function () { toggleStrikeThru(p); });
            container.appendChild(cb);
            const editicon = document.createElement('i');
            editicon.classList.add('fa-regular');
            editicon.classList.add('fa-pen-to-square');
            editicon.addEventListener('click', function () { toggleEditLineItem(item.itemid) });
            container.appendChild(editicon);
            p.addEventListener('touchstart', handleTouchStart);
            p.addEventListener('touchend', handleTouchEnd);
            frag.appendChild(container);
        });
        targetNode.appendChild(frag);
    }
    await renderAddButton();
}

async function renderLoginForm() {
    const targetNode = document.getElementById('main');
    clearAndReRender(targetNode)
    const frag = new DocumentFragment();
    const title = document.createElement('h2');
    title.innerText = "Login";
    const loginform = document.createElement('form');
    loginform.classList.add("loginform");
    frag.appendChild(title);
    frag.appendChild(loginform);

    const inputgroup = document.createElement('div');
    inputgroup.classList.add("input-group");
    loginform.appendChild(inputgroup);

    const unamelabel = document.createElement('label');
    unamelabel.innerText = "Username";
    unamelabel.setAttribute("for", "username");
    unamelabel.classList.add("input");
    inputgroup.appendChild(unamelabel);

    const unameinput = document.createElement('input');
    unameinput.setAttribute("type", "text");
    unameinput.classList.add("input");
    unameinput.required = true;
    unameinput.setAttribute("name", "username");
    inputgroup.appendChild(unameinput);

    const inputgrouppwd = document.createElement('div');
    inputgrouppwd.classList.add("input-group");
    loginform.appendChild(inputgrouppwd);

    const pwdlabel = document.createElement('label');
    pwdlabel.innerText = "Password";
    pwdlabel.setAttribute("for", "password");
    pwdlabel.classList.add("input");
    inputgrouppwd.appendChild(pwdlabel);

    const pwdinput = document.createElement('input');
    pwdinput.setAttribute("type", "password");
    pwdinput.required = true;
    pwdinput.classList.add("input");
    pwdinput.setAttribute("name", "password");
    inputgrouppwd.appendChild(pwdinput);

    const errmsg = document.createElement('span');
    errmsg.classList.add("error-message");
    loginform.appendChild(errmsg);

    const btn = document.createElement('button');
    btn.innerText = "Login";
    btn.setAttribute("type", "submit");
    btn.classList.add("button");
    loginform.appendChild(btn);

    loginform.addEventListener('submit', LoginSubmit);
    targetNode.appendChild(frag);
}

async function LoginSubmit(event) {
    event.preventDefault();
    const data = new FormData(event.target);
    const uname = data.get('username');
    const pwd = data.get('password');
    var payload = new Object();
    payload.username = uname;
    payload.password = pwd;

    const uri = `https://${config.domain}/pubapi/login`;
    await fetch(uri, {
        "headers": {
            'Accept': 'application/json, text/plain',
            'Content-Type': 'application/json'
        },
        "method": "POST",
        "body": JSON.stringify(payload)
    })
        .then((response) => response.json())
        .then(() => {
            window.history.pushState({}, '', "/");
            handleLocation();
        })
}

async function makeConfirmListDeleteModal(id) {
    const parent = document.getElementById("main");
    const modal = document.createElement('div');
    modal.classList.add('modal');
    modal.id = "confirm-delete-modal";

    const modalcontent = document.createElement('div');
    modalcontent.classList.add('modal-content');
    const text = document.createElement('p');
    text.innerText = "Actually delete this list and its contents?  Cannot be undone!";

    const yesbtn = document.createElement('button');
    yesbtn.setAttribute('type', 'button');
    yesbtn.addEventListener('click', (e) => {
        e.preventDefault();
        return actuallyDeleteList(id);
    }, false);
    yesbtn.innerText = "Yes";
    
    const nobtn = document.createElement('button');
    nobtn.setAttribute('type', 'button');
    nobtn.addEventListener('click', (e) => {
        e.preventDefault();
        return removeModal(modal);
    }, false);
    nobtn.innerText = "No";

    const frag = new DocumentFragment();
    frag.append(modal);
    modal.append(text, yesbtn, nobtn);
    
    parent.appendChild(frag);

}

async function actuallyDeleteList(id) {    
    const uri = `${endPoint}deletelist/${id}`;
    const response = await fetch(uri, {
        "headers": {
            'Accept': 'application/json, text/plain',
            'Content-Type': 'application/json'
        },
        "method": "GET"
    });
    const resp = await response.json()
    if (resp.success) {
            window.history.pushState({}, '', "/");
            handleLocation();
    }
    else {
        var frag = new DocumentFragment();
        const d = document.createElement('div');
        const p = document.createElement('p');
        d.classList.add('errormsg');
        p.innerText = resp.error;
        d.appendChild(p);
        frag.appendChild(d);
        const parent = document.getElementById('main');
        parent.prepend(frag);
        
        setTimeout(() => {
            if (d) {
                d.remove();
            }
        }, 5000);
    }
}

async function shareSubmit(id) {
    const form = document.getElementById("share-list-form");
    const checkboxes = form.querySelectorAll('input[type="checkbox"]');
    const formData = [];

    checkboxes.forEach(checkbox => {
        formData.push({
            key: parseInt(checkbox.name, 10),
            value: checkbox.checked // Boolean value indicating checked/unchecked
        });
    });

    const s = `${endPoint}list/${id}/setsharedusers`;
    const resp = await fetch(s, {
        "headers": {
            'Accept': 'application/json, text/plain',
            'Content-Type': 'application/json'
        },
        "method": "POST",
        "body": JSON.stringify(formData)
    });
    const response = await resp.json();

    if (response.error) {
        //handle error
        console.log("error saving share settings");
    } 
}

async function renderListSettingsPage(id) {
    const targetNode = document.getElementById("main");
    clearAndReRender(targetNode);

    const backlink = document.createElement('a');
    backlink.href = `/list/${id}`;
    backlink.id = "back-btn";
    backlink.innerText = "Back to List";
    const navbar = document.getElementById('nav');
    const hamburger = document.getElementById("#hamburger");
    navbar.insertBefore(backlink, hamburger);
    
    const users = await fetchUsers(id);
    if (users.error) {
        window.history.pushState({}, '', "/");
        handleLocation();
    }
    else {
        const frag = new DocumentFragment();
        const hthree = document.createElement("h3");
        hthree.innerText = "Share This List With:";
        frag.appendChild(hthree);

        const form = document.createElement("form");
        form.id = "share-list-form";
        users.forEach(item => {
            const ipt = document.createElement("input");
            ipt.type = "checkbox";
            ipt.name = item.index;
            ipt.id = item.username;
            ipt.checked = item.shared;
            const lbl = document.createElement("label");
            lbl.htmlFor = ipt.id;
            lbl.innerText = item.username;
            const br = document.createElement("br");
            form.appendChild(ipt);
            form.appendChild(lbl);
            form.appendChild(br);
        });

        const btn = document.createElement('button');
        btn.innerText = "Share";
        btn.setAttribute("type", "submit");
        btn.classList.add("button");
        form.appendChild(btn);

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            shareSubmit(id);
        });
        frag.appendChild(form);

        const hthreetwo = document.createElement("h3"); //lol
        hthreetwo.innerText = "Delete This List";
        const delbtn = document.createElement('button');
        delbtn.setAttribute('type', 'button');
        delbtn.addEventListener('click', (e) => {
            e.preventDefault();
            makeConfirmListDeleteModal(id);
        }, false);
        delbtn.innerText = "Delete List";
        frag.append(hthreetwo, delbtn);
        targetNode.appendChild(frag);
    }
}

async function renderListOverview() {
    const targetNode = document.getElementById("main");
    clearAndReRender(targetNode);
    const lists = await fetchListsByUser();
    if (lists.error) {
        window.history.pushState({}, '', "/login");
        handleLocation();
    }
    else {
        const frag = new DocumentFragment();
        lists.forEach(l => {
            const container = document.createElement("div");
            container.classList.add('lineitem');
            const anchor = document.createElement("a");
            anchor.classList.add('listlink');
            anchor.href = `/list/${l.listid}`;
            anchor.innerText = l.name;
            container.appendChild(anchor);
            frag.appendChild(container);
        });
        targetNode.appendChild(frag);
        await renderAddButton();
    }
}

async function insertListDB(newLine){
    var payload = new Object();
    var inputs = newLine.getElementsByTagName("input");
    payload.payload = inputs[0].value;
    
    const uri = `${endPoint}newlist`;
    await fetch(uri, {
        "headers": {
            'Accept': 'application/json, text/plain',
            'Content-Type': 'application/json'
        },
        "method": "POST",
        "body": JSON.stringify(payload)
    })
        .then(response => response.json())
        .then(data => {
            if(data.success) {
                var link = document.createElement("a");
                link.innerText = inputs[0].value;
                link.href = `/list/${data.success}`;
                link.classList = "listlink";
                newLine.replaceChildren(link);
                newLine.id = data.success;
            }
            else {
                var frag = new DocumentFragment();
                const d = document.createElement('div');
                const p = document.createElement('p');
                d.classList.add('errormsg');
                p.innerText = data.message;
                d.appendChild(p);
                frag.appendChild(d);
                const parent = document.getElementById('main');
                parent.insertBefore(frag, newLine);

                setTimeout(() => {
                    if (d) {
                        d.remove();
                    }
                }, 5000);
            }
        });
}

//fix this
async function insertListItemDB(newLine){
    var payload = new Object();
    var inputs = newLine.getElementsByTagName("input");
    payload.payload = inputs[0].value;
    var listid = window.location.pathname.split('/')[2];
    const uri = `${endPoint}list/${listid}/newitem`;
    await fetch(uri, {
        "headers": {
            'Accept': 'application/json, text/plain',
            'Content-Type': 'application/json'
        },
        "method": "POST",
        "body": JSON.stringify(payload)
    })
        .then(response => response.json())
        .then(data => {
            if(data.result) {
                var para = document.createElement("p");
                para.innerText = inputs[0].value;
                newLine.replaceChildren(para);
                newLine.id = data.result;
                para.addEventListener('touchstart', handleTouchStart);
                para.addEventListener('touchend', handleTouchEnd);
                const frag = new DocumentFragment();
                const cb = document.createElement('input');
                cb.type = "checkbox";
                cb.addEventListener('change', function () { toggleStrikeThru(para); });
                frag.appendChild(cb);
                const editicon = document.createElement('i');
                editicon.classList.add('fa-regular');
                editicon.classList.add('fa-pen-to-square');
                editicon.addEventListener('click', function () { toggleEditLineItem(data.result) });
                frag.appendChild(editicon);
                newLine.appendChild(frag);
                document.body.offsetHeight;
            }
            else {
                var frag = new DocumentFragment();
                const d = document.createElement('div');
                const p = document.createElement('p');
                d.classList.add('errormsg');
                p.innerText = data.message;
                d.appendChild(p);
                frag.appendChild(d);
                const parent = document.getElementById('main');
                parent.insertBefore(frag, newLine);

                setTimeout(() => {
                    if (d) {
                        d.remove();
                    }
                }, 5000);
            }
        });
}

async function insertItem() {
    const parent = document.getElementById('main');
    const frag = new DocumentFragment();
    const newLine = document.createElement('div');
    newLine.classList.add('lineitem');

    const input = document.createElement('input');
    input.type = "text";

    const savebtn = document.createElement('button');
    savebtn.setAttribute('type', 'button');
    //what the fuck was i thinking
    const where = window.location.pathname;
        if (where === "/") {
            savebtn.addEventListener('click', async (e) => {
                e.preventDefault();
                insertListDB(newLine);
            });
        } else {
            savebtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await insertListItemDB(newLine);
            });
        }
    savebtn.innerText = "Save";

    const cancelbtn = document.createElement('button');
    cancelbtn.setAttribute('type', 'button');
    cancelbtn.addEventListener('click', async (e) => {
        e.preventDefault();
        newLine.replaceChildren();
        newLine.remove();
    }, false);
    cancelbtn.innerText = "Cancel";

    frag.appendChild(newLine);
    newLine.append(input, savebtn, cancelbtn);
    parent.insertBefore(frag, document.getElementById('plus-btn'));
    input.focus();
    window.scrollTo(0, document.body.scrollHeight);
}

async function renderAddButton() {
    const targetnode = document.getElementById('main');
    const img = document.createElement('img');
    img.src = "/img/add-circle.png";
    img.id = "plus-btn";
    img.addEventListener('click', insertItem);
    targetnode.appendChild(img);
}

async function matchURLtoRoute(urlSegments) {
    const routeParams = {};
    const matchedRoute = routes.find(route => {
        const routePathSegments = route.path.split('/').slice(1);
        if (routePathSegments.length !== urlSegments.length) {
            return false;
        }

        const match = routePathSegments.every((routePathSegment, i) => {
            return routePathSegment === urlSegments[i] || routePathSegment[0] === ':';
        });

        if (match) {
            routePathSegments.forEach((segment, i) => {
                if (segment[0] === ':') {
                    const propName = segment.slice(1);
                    routeParams[propName] = decodeURIComponent(urlSegments[i]);
                }
            });
        }

        return match;
    });

    return { ...matchedRoute, params: routeParams };
}

async function handleLocation() {
    const pathSplit = window.location.pathname.split('/').slice(1);
    const route = await matchURLtoRoute(pathSplit);
    await route.callback(route.params);
}

async function route(e) {
    if (e.target.matches('a') && e.target.origin === location.origin) {
        e.preventDefault();
        e.stopPropagation();
        window.history.pushState({}, '', e.target.href);
        await handleLocation(true);
    }
}

async function getAuthCookie() {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; auth=`);
    if (parts.length === 2) {
        return parts.pop().split(';').shift();
    }
}

async function togglenav() {
    var x = document.getElementById("nav");
    if (x.className === "") {
        x.className = "vis";
    } else {
        x.className = "";
    }
}

// Set up the MutationObserver at the top level
// const observer = new MutationObserver((mutationsList) => {
//     mutationsList.forEach((mutation) => {
//         mutation.removedNodes.forEach((node) => {
//             if (node.nodeType === 1) {
//                 console.log('Element removed from DOM:', node);
//             }
//         });
//     });
// });

document.addEventListener('click', route, false);
window.addEventListener('popstate', function () {
    handleLocation();
});

window.addEventListener('DOMContentLoaded', function () {
    //    observer.observe(document.body, { childList: true, subtree: true });
    handleLocation();
});
