/*
 * Copyright 2021-2023 Open Text.
 *
 * The only warranties for products and services of Open Text and
 * its affiliates and licensors (“Open Text”) are as may be set forth
 * in the express warranty statements accompanying such products and services.
 * Nothing herein should be construed as constituting an additional warranty.
 * Open Text shall not be liable for technical or editorial errors or
 * omissions contained herein. The information contained herein is subject
 * to change without notice.
 *
 * Except as specifically indicated otherwise, this document contains
 * confidential information and a valid license is required for possession,
 * use or copying. If this work is provided to the U.S. Government,
 * consistent with FAR 12.211 and 12.212, Commercial Computer Software,
 * Computer Software Documentation, and Technical Data for Commercial Items are
 * licensed to the U.S. Government under vendor's standard commercial license.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *   http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { AbstractButtonTemplate } from "./abstract-button-template";

export class OpenInBrowserButtonTemplate extends AbstractButtonTemplate {

    constructor(actionName: string) {
        super(actionName);
    }

    generateButtonContent(): string {
        return `
            <svg style="margin: 0rem 0rem 0rem 0.22rem;" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="16px" height="16px" viewBox="0 0 16 16" enable-background="new 0 0 16 16" xml:space="preserve">  <image id="image0" width="16" height="16" x="0" y="0"
                href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAABGdBTUEAALGPC/xhBQAAACBjSFJN
                AAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAABPlBMVEU8r9wAAAA8r9w8r9w8
                r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8
                r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8
                r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8
                r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8
                r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8
                r9w8r9w8r9w8r9w8r9w8r9z///8oFSlUAAAAaHRSTlMAAAYnjNTyGo20029l0rUZHLZLP5lmPhsF
                g8nISGBJhSSzLe++4+bkLIRTiotUxoJeTQ5qUsXrXV9Fl896Y8TqXGsmbdrnKmn2/vQ1Sv0Y+fWl
                zqQr3cKyf5uPOstWWQkwZ6kfiG5wPP2isbsAAAABYktHRGm8a8S0AAAACXBIWXMAAAsTAAALEwEA
                mpwYAAAAB3RJTUUH5QwCEC0tnHeg8QAAAO1JREFUGNNFj3lTgnAYhN9FEFKyNDGTKASzIMy8kg7T
                srJLu8sOu7T8ff9PIDTMtH8+M7vzLBGBC/FCOCzwIQ7kBaI0FYnKcnQ6Js14BLPxxFwSioJkKhGf
                B6UXhIy6CE3DkpoRljnSszDM3Eo+v5oz15DVybJhr8OvwLFRsGgDKG6WyhUZqBaBGm3VXXV7Z1ff
                UxrSvltvUrN1cNg+YscnnQCo0E4ZO2PnF0Hlst1lPqiJcKr+aO+KXd/csrv7h0fTwJNOfcYDzy+v
                7p+Ylaa3xuD94xOdL1895ql/Y8j3Rz+K/BucGwPc0Pm/PwGN2CP+EoNwngAAACV0RVh0ZGF0ZTpj
                cmVhdGUAMjAyMS0xMi0wMlQxMzo0NTo0NSswMzowMD81oSsAAAAldEVYdGRhdGU6bW9kaWZ5ADIw
                MjEtMTItMDJUMTM6NDU6NDUrMDM6MDBOaBmXAAAAAElFTkSuQmCC" />
            </svg>
        `;
    }

    protected generateTitle(): string {
        return `title="Open in browser"`;
    }

}