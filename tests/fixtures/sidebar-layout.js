// Render the actual packaged footer, button and dropdown-label components.
// This is a layout fixture, not a mock of authentication or the full application.
import {t as react} from '../../extension/codex-sidepanel/assets/react-BUD3sqOU.js';
import {t as client} from '../../extension/codex-sidepanel/assets/client-CkPScjoH.js';
import {t as Footer} from '../../extension/codex-sidepanel/assets/composer-footer-qYx226iy.js';
import {t as Dropdown} from '../../extension/codex-sidepanel/assets/composer-footer-dropdown-BwNgnu-x.js';
import {t as Label} from '../../extension/codex-sidepanel/assets/composer-dropdown-label-DwjTBfbx.js';
import {t as Button} from '../../extension/codex-sidepanel/assets/button-DBhf2G-H.js';
import {i as ObserverContext,n as createObserver} from '../../extension/codex-sidepanel/assets/resize-observer-elements-BRJk8Wu1.js';
const React=react();const h=React.createElement;
const icon=(path)=>h('svg',{'aria-hidden':true,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.7},h('path',{d:path}));
const model=h('span',{className:'_ModelPickerTriggerContent_15uud_1'},h('span',{className:'_ModelPickerTriggerLabel_15uud_18'},
  h('span',{className:'_ModelPickerTriggerModelLabel_15uud_40'},h('span',{className:'_ModelPickerTriggerModelText_15uud_41'},'GPT 6.1 Sol')),
  h('span',{className:'_ModelPickerTriggerEffortLabel_15uud_54'},'Medium')));
client().createRoot(document.getElementById('root')).render(h(ObserverContext.Provider,{value:createObserver()},h('main',{className:'fixture'},
  h('header',null,'Sidebar layout test'),h('div',{className:'empty'},'Packaged UI components'),
  h('section',{className:'composer'},h('div',{className:'input',contentEditable:true,'aria-label':'Do anything'},'Do anything'),
    h(Footer,null,h('div',{className:'footer'},
      h('div',{className:'control-row'},
        h(Button,{size:'composer',color:'ghost',uniform:true,'aria-label':'Add files and more'},icon('M12 4v16M4 12h16')),
        h(Dropdown,{'aria-label':'Full access','data-composer-navigation-target':'permissions',value:'Full access',foreground:'warning',collapse:'xs',indicator:'none',icon:icon('M12 2L3 6v7c0 5 9 9 9 9s9-4 9-9V6L12 2zM12 7v6m0 3v1')})),
      h('div',{className:'control-row'},
        h(Button,{size:'composer',color:'ghost',className:'min-w-0','aria-label':'GPT 6.1 Sol Medium','data-composer-navigation-target':'reasoning','data-codex-intelligence-trigger':true},
          h(Label,{collapse:'none',indicator:'none',selectedValue:model,selectedValueViewport:'expanded',foreground:'tertiary'})),
        h(Button,{size:'composer',color:'ghost',uniform:true,'aria-label':'Dictate'},icon('M9 4a3 3 0 0 1 6 0v8a3 3 0 0 1-6 0zM5 10v2a7 7 0 0 0 14 0v-2M12 19v3')),
        h(Button,{size:'composer',color:'ghost',uniform:true,'aria-label':'Send'},icon('M12 20V4M5 11l7-7 7 7')))))))));
