import { expect } from 'chai';
import SettingSDK from './SettingSDK';
import * as _ from 'lodash';

let settingSDK = new SettingSDK('testPlugin');

describe('SettingSDK', () => {
    let dbSetting = {
        DB_PORT: 5984
    }
    it('should put seeting', (done) => {
        settingSDK.put('DB_DETAILS', dbSetting).then(() => {
            done()
        })
    })

    it('should get the setting', (done) => {
        settingSDK.get('DB_DETAILS').then(dbSettingRes => {
            expect(_.isEqual(dbSettingRes, { DB_PORT: 5984 })).to.be.true;
            done()
        })
    })
})