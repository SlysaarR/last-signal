package com.slysaarr.lastsignal;

import android.content.Context;
import android.view.KeyEvent;
import androidx.lifecycle.Lifecycle;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.json.JSONArray;
import org.junit.Test;
import org.junit.runner.RunWith;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import static org.junit.Assert.*;
import static org.junit.Assume.assumeTrue;

// Two separate instrumentation invocations, with adb install -r between them.
// The baseline and current debug builds use the same CI-generated debug key.
@RunWith(AndroidJUnit4.class)
public class UpgradeTest {
    private String js(ActivityScenario<MainActivity> scene, String script) throws Exception {
        CountDownLatch latch=new CountDownLatch(1); AtomicReference<String> value=new AtomicReference<>();
        scene.onActivity(a -> a.gameView().evaluateJavascript(script,r->{value.set(r);latch.countDown();}));
        assertTrue("JS callback",latch.await(30,TimeUnit.SECONDS));return value.get();
    }
    private void until(ActivityScenario<MainActivity> scene, String expression) throws Exception {
        long deadline=System.currentTimeMillis()+60000;
        while(System.currentTimeMillis()<deadline){if("true".equals(js(scene,expression)))return;Thread.sleep(100);}
        fail("Timed out: "+expression+"; test error: "+js(scene,"window.upgradeError"));
    }
    private Context context(){return InstrumentationRegistry.getInstrumentation().getTargetContext();}
    private String save(ActivityScenario<MainActivity> scene) throws Exception {
        return new JSONArray("["+js(scene,"localStorage.getItem('last-signal-v1')")+"]").getString(0);
    }
    @Test public void seedPreviousVersion() throws Exception {
        assumeTrue("seed".equals(InstrumentationRegistry.getArguments().getString("upgradePhase")));
        try(ActivityScenario<MainActivity> scene=ActivityScenario.launch(MainActivity.class)){
            until(scene,"!!window.LastSignalApp");
            assertEquals("\"0.55.4-test.1\"",js(scene,"LastSignalAndroid.version()"));
            js(scene,"""
                (async()=>{try{
                  console.log('UPGRADE seed imports');const {s,save}=await import('https://appassets.androidplatform.net/assets/game/js/storage.js?v=0.55.4');
                  const {types}=await import('https://appassets.androidplatform.net/assets/game/data/items.js?v=0.55.4');
                  const {acceptOrder}=await import('https://appassets.androidplatform.net/assets/game/js/orders.js?v=0.55.4');
                  const {startGuide}=await import('https://appassets.androidplatform.net/assets/game/data/guide.js?v=0.55.4');
                  const {depart}=await import('https://appassets.androidplatform.net/assets/game/js/camp.js?v=0.55.4');
                  const excavation=await import('https://appassets.androidplatform.net/assets/game/js/excavation.js?v=0.55.4');
                  const {createBackup}=await import('https://appassets.androidplatform.net/assets/game/js/backup-format.js?v=0.55.4');
                  console.log('UPGRADE seed state');document.getElementById('continueGame').click();
                  s.coins=345;s.collection=types.flatMap((t,id)=>t.kind==='trash'?[]:[id]).slice(0,3);
                  s.best=Object.fromEntries(s.collection.map(id=>[id,86]));
                  s.bag=[{type:s.collection[0],condition:73}];
                  if(!acceptOrder('kop10'))throw Error('Order fixture');startGuide(s);
                  console.log('UPGRADE seed depart');if(!depart())throw Error('Departure fixture');document.getElementById('modalClose').click();
                  // Use the procedural button: this is a persistence test. Coin-photo
                  // readback on the emulator's software GPU is tracked separately.
                  s.energy=41.5;s.pending={type:3,condition:86,spent:7.5};
                  console.log('UPGRADE seed excavation');excavation.openExcavation();excavation.brushAt(220,180);
                  if(!s.pending.cleanedCells?.length||s.pending.cleanedCells.length===256)throw Error('Partial find fixture');
                  console.log('UPGRADE seed save');createBackup(s);if(!save())throw Error('Seed save');
                  localStorage.setItem('last-signal-language','en');localStorage.setItem('last-signal-text-size','130');
                  console.log('UPGRADE seed ready');window.upgradeReady=true;
                }catch(e){window.upgradeError=String(e)}})()
                """);
            until(scene,"window.upgradeReady===true");
            String expected=save(scene);
            assertTrue(context().getSharedPreferences("upgrade-test",0).edit().putString("expected",expected).commit());
        }
    }
    @Test public void verifyUpdatedVersion() throws Exception {
        assumeTrue("verify".equals(InstrumentationRegistry.getArguments().getString("upgradePhase")));
        String expected=context().getSharedPreferences("upgrade-test",0).getString("expected",null);
        assertNotNull("Previous installation data survived",expected);
        try(ActivityScenario<MainActivity> scene=ActivityScenario.launch(MainActivity.class)){
            until(scene,"!!window.LastSignalApp");
            assertEquals("\"0.55.5-test.2\"",js(scene,"LastSignalAndroid.version()"));
            assertEquals(expected,save(scene));
            assertEquals("\"en\"",js(scene,"localStorage.getItem('last-signal-language')"));
            assertEquals("\"130\"",js(scene,"localStorage.getItem('last-signal-text-size')"));
            assertEquals("true",js(scene,"!document.getElementById('backupAutoRecovery').disabled"));
            js(scene,"document.getElementById('openSettings').click();document.querySelectorAll('[data-pane]').forEach(b=>{if(b.dataset.pane==='settings:backup')b.click()});document.getElementById('backupAutoRecovery').click()");
            assertEquals("true",js(scene,"document.getElementById('backupDialog').open"));
            js(scene,"document.getElementById('backupCancel').click()");assertEquals(expected,save(scene));
            InstrumentationRegistry.getInstrumentation().sendKeyDownUpSync(KeyEvent.KEYCODE_BACK);
            until(scene,"!document.getElementById('menu').hidden");
            js(scene,"document.getElementById('continueGame').click()");
            assertEquals("true",js(scene,"document.getElementById('excavate').open"));
            InstrumentationRegistry.getInstrumentation().sendKeyDownUpSync(KeyEvent.KEYCODE_BACK);
            assertEquals("true",js(scene,"document.getElementById('excavate').open"));
            for(int i=0;i<20;i++){
                scene.moveToState(Lifecycle.State.CREATED);scene.moveToState(Lifecycle.State.RESUMED);
            }
            assertEquals(expected,save(scene));
            // Exercise real automatic-backup recovery after a malformed primary save.
            // A separate same-origin test document writes after all game unload
            // handlers, so lifecycle autosaving cannot repair this fixture first.
            scene.onActivity(a -> a.gameView().loadDataWithBaseURL(
                "https://appassets.androidplatform.net/assets/game/",
                "<script>localStorage.setItem('last-signal-v1','{broken');location.replace('https://appassets.androidplatform.net/assets/game/index.html')</script>",
                "text/html","UTF-8",null));
            until(scene,"!!window.LastSignalApp && !document.getElementById('saveNote').hidden");
            assertEquals("{broken",save(scene));
            js(scene,"document.getElementById('openSettings').click();document.querySelectorAll('[data-pane]').forEach(b=>{if(b.dataset.pane==='settings:backup')b.click()});document.getElementById('backupAutoRecovery').click()");
            assertEquals("true",js(scene,"document.getElementById('backupDialog').open"));
            assertEquals("{broken",save(scene));
            js(scene,"window.restoreMarker=true;document.getElementById('backupConfirm').click()");
            until(scene,"!!window.LastSignalApp && window.restoreMarker===undefined");
            assertEquals(expected,save(scene));
            js(scene,"document.getElementById('continueGame').click()");
            assertEquals("true",js(scene,"document.getElementById('excavate').open"));
        }
    }
}
