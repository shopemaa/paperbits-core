import { Bag } from "@paperbits/common";
import { ComponentFlow, ContainerModelBinder, IWidgetBinding } from "@paperbits/common/editing";
import { EventManager, Events } from "@paperbits/common/events";
import { IPopupService } from "@paperbits/common/popups";
import { StyleCompiler } from "@paperbits/common/styles";
import { IWidgetService, ViewModelBinder } from "@paperbits/common/widgets";
import { PopupInstanceContract } from "../popupContract";
import { ViewModelBinderSelector } from "../../ko/viewModelBinderSelector";
import { Placeholder } from "../../placeholder/ko/placeholder";
import { PopupHandlers } from "../popupHandlers";
import { PopupInstanceModel } from "../popupModel";
import { PopupViewModel } from "./popup";

export class PopupViewModelBinder implements ViewModelBinder<PopupInstanceModel, PopupViewModel> {
    constructor(
        private readonly containerModelBinder: ContainerModelBinder,
        private readonly viewModelBinderSelector: ViewModelBinderSelector,
        private readonly popupService: IPopupService,
        private readonly eventManager: EventManager,
        private readonly styleCompiler: StyleCompiler,
        private readonly widgetService: IWidgetService
    ) { }

    public createBinding(model: PopupInstanceModel, viewModel?: PopupViewModel, bindingContext?: Bag<any>): void {
        let savingTimeout;

        const updateContent = async (): Promise<void> => {
            /**
             * TODO: Temporary hack. With current model it's impossible to tell which content (page or content)
             * is being modified, so we look for active popup.
             */
            if (!bindingContext.getHostedDocument) {
                return;
            }

            const activePopup: HTMLElement = bindingContext.getHostedDocument().querySelector(".popup.show");

            if (!activePopup) {
                return;
            }

            const popupIdentifier = activePopup.id.replace("popups", "");
            const popupKey = `popups/${popupIdentifier}`;

            if (model.key !== popupKey) {
                return;
            }

            const popupInstanceContract: PopupInstanceContract = {
                type: "popup",
                backdrop: model.backdrop,
                styles: model.styles,
                nodes: []
            };

            const childNodes = this.containerModelBinder.getChildContracts(model.widgets);
            popupInstanceContract.nodes.push(...childNodes);

            await this.popupService.updatePopupContent(model.key, popupInstanceContract);
        };

        const scheduleUpdate = (): void => {
            clearTimeout(savingTimeout);
            savingTimeout = setTimeout(updateContent, 500);
        };

        const binding: IWidgetBinding<PopupInstanceModel, PopupViewModel> = {
            name: "popup",
            displayName: "Popup",
            layer: "*",
            flow: ComponentFlow.Block,
            model: model,
            draggable: true,
            editor: "popup-editor",
            provides: ["popup"],
            handler: PopupHandlers,
            applyChanges: async () => {
                await this.modelToViewModel(model, viewModel, bindingContext);
                this.eventManager.dispatchEvent(Events.ContentUpdate, model.key);
            },
            onCreate: () => {
                this.eventManager.addEventListener(Events.ContentUpdate, scheduleUpdate);
            },
            onDispose: () => {
                this.eventManager.removeEventListener(Events.ContentUpdate, scheduleUpdate);
            }
        };

        viewModel["widgetBinding"] = binding;
    }

    public async modelToViewModel(model: PopupInstanceModel, viewModel?: PopupViewModel, bindingContext?: Bag<any>): Promise<PopupViewModel> {
        if (!viewModel) {
            viewModel = new PopupViewModel();
        }

        // let childBindingContext: Bag<any> = {};

        // if (bindingContext) {
        //     childBindingContext = <Bag<any>>Objects.clone(bindingContext);
        //     childBindingContext.layer = "*"; 
        // }

        bindingContext.layer = "*";


        const promises = model.widgets.map(widgetModel => {
            const definition = this.widgetService.getWidgetDefinitionForModel(widgetModel);

            if (definition) {
                const bindingPromise = this.widgetService.createWidgetBinding(definition, widgetModel, bindingContext);
                return bindingPromise;
            }

            // legacy binding resolution
            const widgetViewModelBinder = this.viewModelBinderSelector.getViewModelBinderByModel(widgetModel);
            const bindingPromise = widgetViewModelBinder.modelToViewModel(widgetModel, null, bindingContext);
            return bindingPromise;
        });

        const widgetViewModels = await Promise.all(promises);

        // for (const widgetModel of model.widgets) {
        //     const widgetViewModelBinder = this.viewModelBinderSelector.getViewModelBinderByModel(widgetModel);

        //     if (widgetViewModelBinder.createWidgetBinding) {
        //         const binding = await widgetViewModelBinder.createWidgetBinding<any>(widgetModel, bindingContext);
        //         widgetViewModels.push(binding);
        //     }
        //     else {
        //         const widgetViewModel = await widgetViewModelBinder.modelToViewModel(widgetModel, null, bindingContext);
        //         widgetViewModels.push(widgetViewModel);
        //     }
        // }

        if (widgetViewModels.length === 0) {
            widgetViewModels.push(new Placeholder("Popup content"));
        }

        if (model.styles) {
            viewModel.styles(await this.styleCompiler.getStyleModelAsync(model.styles, bindingContext?.styleManager));
        }

        viewModel.identifier(model.key.replace("popups/", "popups"));
        viewModel.widgets(widgetViewModels);
        viewModel.backdrop(model.backdrop);

        if (!viewModel["widgetBinding"]) {
            this.createBinding(model, viewModel, bindingContext);
        }

        return viewModel;
    }

    public canHandleModel(model: PopupInstanceModel): boolean {
        return model instanceof PopupInstanceModel;
    }
}