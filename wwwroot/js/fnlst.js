"use strict";

// yes it's all one giant file fight me

const config = {
    domain: '127.0.0.1',
    port: '8585',
    path: '/api/'
};
const endPoint = `http://${config.domain}:${config.port}${config.path}`;

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
    }
];

async function doLogout(){
    const s = `http://${config.domain}:${config.port}/pubapi/logout`;
    await fetch(s, {
        method: 'GET',
    })
        .then((response) => {
            if(response.bodyUsed){
                const j = response.json();
                console.log(j);
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

async function renderAboutPage(){
    const target = document.getElementById("main");
    target.replaceChildren();
    const s = `http://${config.domain}:${config.port}/pubapi/about`;
    const fetchresponse = await fetch(s, {
        method: 'GET',
    });
    const resp = await fetchresponse.json();
    const ver = resp.payload;
    const para = document.createElement('p');
    para.innerText = `Welcome to Finalist ${ver}, the final list app you'll ever need.`;
    target.appendChild(para);
}

async function fetchListContents(id) {
    const s = `${endPoint}list/${id}`;
    const fetchresponse = await fetch(s, {
        method: 'GET',
    });
    const resp = await fetchresponse.json();
    return resp;
}

async function fetchListsByUser() {
    const s = `${endPoint}listview`;
    const resp = await fetch(s, {
        method: 'GET',
    })
        .then(response => {
            if (response.status === 401) {
                const redirectUrl = response.headers.get('Location');
                var payload = new Object;
                payload.error = true;
                payload.redirect = redirectUrl;
                return payload;
            }
            else {
                return response.json();
            }
        })

    return resp;
}

async function toggleStrikeThru(id) {
    const children = document.getElementById(id).getElementsByTagName('p');
    for (let child of children) {
        child.classList.toggle('strike');
    }
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
        return actuallyDeleteLineItem(id);
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

async function actuallyDeleteLineItem(id) {
    var pathsegments = window.location.pathname.split("/");
    var listid = pathsegments[2];
    var payload = new Object();
    payload.id = id;
    
    const uri = `${endPoint}list/${listid}/delete/${id}`;
    await fetch(uri, {
        "headers": {
            'Accept': 'application/json, text/plain',
            'Content-Type': 'application/json'
        },
        "method": "GET"
    })
        .then(() => {
            var target = document.getElementById(id);
            target.replaceChildren();
            target.remove();
        });
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

async function renderListContents(id) {
    const targetNode = document.getElementById('main');
    targetNode.replaceChildren();
    const items = await fetchListContents(id);
    if (items != null  && items.redirect) {
        window.history.pushState({}, '', items.redirect);
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
            cb.addEventListener('change', function () { toggleStrikeThru(item.itemid); });
            container.appendChild(cb);
            const editicon = document.createElement('i');
            editicon.classList.add('fa-regular');
            editicon.classList.add('fa-pen-to-square');
            editicon.addEventListener('click', function () { toggleEditLineItem(item.itemid) });
            container.appendChild(editicon);
            frag.appendChild(container);
        });
        targetNode.appendChild(frag);
    }
    await renderAddButton();
}

async function renderLoginForm() {
    const targetNode = document.getElementById('main');
    targetNode.replaceChildren();
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

    const uri = `http://${config.domain}:${config.port}/pubapi/login`;
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

async function renderListOverview() {
    const targetNode = document.getElementById('main');
    targetNode.replaceChildren();
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
    payload.itemname = inputs[0].value;
    
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
            if(data.success === true) {
                var para = document.createElement("p");
                para.innerText = inputs[0].value;
                newLine.replaceChildren(para);
                newLine.id = data.message;
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

                const frag = new DocumentFragment();
                const cb = document.createElement('input');
                cb.type = "checkbox";
                cb.addEventListener('change', function () { toggleStrikeThru(data.result); });
                frag.appendChild(cb);
                const editicon = document.createElement('i');
                editicon.classList.add('fa-regular');
                editicon.classList.add('fa-pen-to-square');
                editicon.addEventListener('click', function () { toggleEditLineItem(data.result) });
                frag.appendChild(editicon);
                newLine.appendChild(frag);
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
    const where = window.location.pathname;
        if (where === "/") {
            savebtn.addEventListener('click', (e) => {
                e.preventDefault();
                insertListDB(newLine);
            });
        } else {
            savebtn.addEventListener('click', (e) => {
                e.preventDefault();
                insertListItemDB(newLine);
            });
        }
    savebtn.innerText = "Save";

    const cancelbtn = document.createElement('button');
    cancelbtn.setAttribute('type', 'button');
    cancelbtn.addEventListener('click', (e) => {
        e.preventDefault();
        newLine.replaceChildren();
        newLine.remove();
    }, false);
    cancelbtn.innerText = "Cancel";

    frag.appendChild(newLine);
    newLine.append(input, savebtn, cancelbtn);
    parent.insertBefore(frag, document.getElementById('plus-btn'));
    input.focus();
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

async function togglenav() {
    var x = document.getElementById("nav");
    if (x.className === "") {
        x.className = "vis";
    } else {
        x.className = "";
    }
}

document.addEventListener('click', route, false);
window.addEventListener('popstate', function () {
    handleLocation();
});

window.addEventListener('DOMContentLoaded', function () {
    handleLocation();
});
