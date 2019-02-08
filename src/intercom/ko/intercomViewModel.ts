import * as ko from "knockout";
import template from "./intercom.html";
import { Component } from "@paperbits/common/ko/decorators";
import { ISettingsProvider } from "@paperbits/common/configuration";

@Component({
    selector: "paperbits-intercom",
    template: template,
    injectable: "intercom"
})
export class IntercomViewModel {
    private readonly settingsProvider: ISettingsProvider;

    public intercomBootstrapper: ko.Observable<string>;

    constructor(settingsProvider: ISettingsProvider) {
        this.settingsProvider = settingsProvider;

        this.intercomBootstrapper = ko.observable<string>();

        this.boot();
    }

    private async boot(): Promise<void> {
        const intercomSettings = await this.settingsProvider.getSetting("intercom");

        if (!intercomSettings || !intercomSettings["appId"]) {
            return;
        }

        const appId = intercomSettings["appId"];

        const bootstrapper = "<script>window.intercomSettings = { app_id: '" + appId + "' };</script>" +
            "<script>(function(){let w=window;let ic=w.Intercom;if(typeof ic==='function'){ic('reattach_activator');ic('update',intercomSettings);}else{let d=document;let i=function(){i.c(arguments)};i.q=[];i.c=function(args){i.q.push(args)};w.Intercom=i;function l(){let s=d.createElement('script');s.type='text/javascript';s.async=true;s.src='https://widget.intercom.io/widget/" + appId + "';let x=d.getElementsByTagName('script')[0];x.parentNode.insertBefore(s,x);}if(w.attachEvent){w.attachEvent('onload',l);}else{w.addEventListener('load',l,false);}}})()</script>";

        this.intercomBootstrapper(bootstrapper);
    }
}