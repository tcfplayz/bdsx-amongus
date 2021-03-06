// thanks mingyee

import { MinecraftPacketIds } from "bdsx/bds/packetids";
import { NetworkIdentifier } from "bdsx/bds/networkidentifier";
import { ServerSettingsResponsePacket, ShowModalFormPacket } from "bdsx/bds/packets";
import { events } from "bdsx/event";

export let FormData = new Map<NetworkIdentifier, {Id:number;func:(data:any)=>void}[]>();
class formJSONTYPE {
    type:"form"|"custom_form"|"modal";
    title:string;
    content:string|any[];
    buttons?:{text:string; image?:any}[];
    button1?:string;
    button2?:string;
}

class formJSON {
    type:"form" = "form";
    title:string = "";
    content:string = "";
    buttons:{text:string; image?:any}[] = [];
}

class CustomformJSON {
    type:"custom_form" = "custom_form";
    title:string = "";
    content:any[] = [];
}

class modalJSON {
    type:"modal" = "modal";
    title:string = "";
    content:string = "";
    button1?:string = "";
    button2?:string = "";
}

class formSetting extends CustomformJSON {
    icon?:{type:"url",data:string}
}

class FormFile {
    json: formJSON = new formJSON();
    handler?: (data: any) => void;
    target: NetworkIdentifier;
    setTitle(title:string) {
        this.json.title = title;
    }
    setContent(content:string) {
        this.json.content = content;
    }
    addButton(text:string, image?:object) {
        return this.json.buttons.push({
            text: text,
            image: image
        });
    }
    addhandler(handler?:(data:number)=>void){
        this.handler = handler;
    }
    send(){
        Formsend(this.target, this.json, this.handler);
    }

}
class CustomFormFile {
    json: CustomformJSON = new CustomformJSON();
    handler?: (data: any) => void;
    target: NetworkIdentifier;
    setTitle(title:string) {
        this.json.title = title;
    }
    addContent(content:object[]) {
        this.json.content = content;
    }
    addhandler(handler?:(data:any)=>void){
        this.handler = handler;
    }
    send(){
        Formsend(this.target, this.json, this.handler);
    }

}

class ModalFile {
    json: modalJSON = new modalJSON();
    handler?: (data: any) => void;
    target: NetworkIdentifier;
    setTitle(title:string) {
        this.json.title = title;
    }
    setContent(content:string) {
        this.json.content = content;
    }
    setButton1(button:string) {
        this.json.button1 = button;
    }
    setButton2(button:string) {
        this.json.button2 = button;
    }
    addhandler(handler?:(data:boolean)=>void){
        this.handler = handler;
    }
    send(){
        Formsend(this.target, this.json, this.handler);
    }

}

/**
  *JsonType example : https://github.com/NLOGPlugins/Form_Json You can use form.write instead of this
*/
export function Formsend(target: NetworkIdentifier, form: formJSONTYPE|object, handler?: (data: any) => void, id?:number) {
    try {
        const modalPacket = ShowModalFormPacket.create();
        let formId = Math.floor(Math.random() * 1147483647) + 1000000000;
        if (typeof id === "number") formId = id;
        modalPacket.setUint32(formId, 0x30);
        modalPacket.setCxxString(JSON.stringify(form), 0x38);
        modalPacket.sendTo(target, 0);
        if (handler === undefined) handler = ()=>{}
        if (!FormData.has(target)) {
            FormData.set(target, [
                {
                    Id: formId,
                    func: handler
                }
            ])
        } else {
            let f = FormData.get(target)!;
            f.push({
                Id: formId,
                func: handler
            })
            FormData.set(target, f);
        }
        modalPacket.dispose();
    } catch (err) {}
}

export namespace form {
    export const create = {
        form:(target: NetworkIdentifier): FormFile => {
            let form = new FormFile();
            form.target = target;
            return form;
        },
        custom_form:(target: NetworkIdentifier): CustomFormFile => {
            let form = new CustomFormFile();
            form.target = target;
            return form;
        },
        modal:(target: NetworkIdentifier): ModalFile => {
            let form = new ModalFile();
            form.target = target;
            return form;
        }

    }

    export const write = Formsend;

    export function setSettingForm (form: (target:NetworkIdentifier)=>formSetting|object, handler = (data: any, target:NetworkIdentifier, json:formSetting) => {}) {
        settingForm = form;
        settingHandler = handler;
    }
}

let settingForm: ((target:NetworkIdentifier)=>formSetting|object)|undefined;
let settingHandler = (data: any, target:NetworkIdentifier, json:formSetting|object) => {};

events.packetAfter(MinecraftPacketIds.ServerSettingsRequest).on((ptr, target) => {
    if (settingForm === undefined) return;
    setTimeout(()=>{
        const packet = ServerSettingsResponsePacket.create();
        packet.setUint32(5928, 0x30);
        packet.setCxxString(JSON.stringify(settingForm!(target)), 0x38);
        packet.sendTo(target);
        packet.dispose();
    }, 2000);
});




events.packetRaw(MinecraftPacketIds.ModalFormResponse).on((ptr, size, target) => {
    ptr.move(1);
    let formId = ptr.readVarUint();
    let formData = ptr.readVarString();
    let data = JSON.parse(formData.replace("\n",""));
    if (formId === 5928) {
        let f = {};
        if (settingForm !== undefined) f = settingForm(target);
        settingHandler(data, target, f);
        return;
    }
    let dataValue = FormData.get(target)!.find((v)=> v.Id === formId)!;
    if (dataValue === undefined) return;
    dataValue.func(data);
    let f = FormData.get(target)!;
    f.splice(f.indexOf(dataValue), 1);
    FormData.set(target, f);
});

import { DeviceOS } from "bdsx/common";

export let playerList:string[] = [];
let nIt = new Map();
let nMt = new Map();
let nXt = new Map();
let nSt = new Map();
events.packetAfter(MinecraftPacketIds.Login).on((ptr, networkIdentifier) => {
    let conq = ptr.connreq;
    if (conq === null) return;
    const cert = conq.cert;
    const device = DeviceOS[conq.getDeviceOS()];
    const xuid = cert.getXuid();
    const username = cert.getId();
    let [ip, port] = String(networkIdentifier).split('|');
    console.log(`${username} : ${ip} [${port}]`);
    nXt.set(username, xuid);
    nIt.set(username, networkIdentifier);
    nMt.set(networkIdentifier, username);
    nSt.set(networkIdentifier, device);
});
events.packetAfter(MinecraftPacketIds.SetLocalPlayerAsInitialized).on((ptr, target) => {
    let playerName:string = NameById(target);
    setTimeout(()=>{
        if(!playerList.includes(playerName)) playerList.push(playerName);
    },100);
});
events.networkDisconnected.on(networkIdentifier => {
    setTimeout(()=>{
        const id = nMt.get(networkIdentifier);
        if (playerList.includes(id)) playerList.splice(playerList.indexOf(id),1);
        nXt.delete(id);
        nMt.delete(networkIdentifier);
        nSt.delete(networkIdentifier);
        nIt.delete(id);
        FormData.delete(networkIdentifier);
    }, 1000);
});
/**
  *get player DeviceOS by Id
*/
export function XuidByName(PlayerName: string) {
    let Rlt = nXt.get(PlayerName);
    if (Rlt === undefined) Rlt = '';
    return Rlt;
}
/**
  *get playerXuid by Name
*/
export function DeviceById(networkIdentifier: NetworkIdentifier):string{
    let Rlt:any = nSt.get(networkIdentifier);
    if (Rlt === undefined) Rlt = '';
    return Rlt;
}
/**
  *get playerName by Id
*/
export function NameById(networkIdentifier: NetworkIdentifier) {
    let actor = networkIdentifier.getActor();
    let playerName:string;
    try {
        playerName = actor!.getName();
    } catch {
        playerName = nMt.get(networkIdentifier);
    }
    return playerName;
}
/**
  *get playerData by Id
  *result = [name,actor,entity, xuid]
*/
export function DataById(networkIdentifier: NetworkIdentifier) {
    let actor = networkIdentifier.getActor();
    let entity = actor!.getEntity();
    let name = actor!.getName();
    let xuid = nXt.get(name);
    return [name, actor, entity, xuid];
}
/**
  *get playerId by Name
*/
export function IdByName(PlayerName: string) {
    let Rlt:NetworkIdentifier = nIt.get(PlayerName);
    return Rlt;
}