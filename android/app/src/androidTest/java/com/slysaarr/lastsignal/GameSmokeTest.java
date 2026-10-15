package com.slysaarr.lastsignal;

import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

@RunWith(AndroidJUnit4.class)
public class GameSmokeTest {
    private String js(ActivityScenario<MainActivity> scenario, String source) throws Exception {
        CountDownLatch done=new CountDownLatch(1); AtomicReference<String> result=new AtomicReference<>();
        scenario.onActivity(a -> a.gameView().evaluateJavascript(source, value -> {result.set(value);done.countDown();}));
        assertTrue("JS callback",done.await(10,TimeUnit.SECONDS)); return result.get();
    }
    private void ready(ActivityScenario<MainActivity> scenario) throws Exception {
        long deadline=System.currentTimeMillis()+20000;
        while(System.currentTimeMillis()<deadline){if("true".equals(js(scenario,"!!window.LastSignalApp")))return;Thread.sleep(250);}
        fail("Packaged game did not start");
    }
    @Test public void offlineStartupBackAndPersistentProgress() throws Exception {
        assertEquals(android.content.pm.PackageManager.PERMISSION_DENIED, InstrumentationRegistry.getInstrumentation().getTargetContext().checkSelfPermission("android.permission.INTERNET"));
        try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(MainActivity.class)){
            ready(scenario);
            assertEquals("true",js(scenario,"document.getElementById('menuVersion').textContent.includes('0.55.4-test.1')"));
            assertEquals("true",js(scenario,"document.getElementById('offlineCheck').hidden && document.getElementById('appUpdate').hidden"));
            assertEquals("true",js(scenario,"document.getElementById('continueGame').click(); !document.getElementById('camp').hidden"));
            assertEquals("\"handled\"",js(scenario,"window.LastSignalApp.back()"));
            assertEquals("true",js(scenario,"!document.getElementById('menu').hidden"));
            assertEquals("\"exit\"",js(scenario,"window.LastSignalApp.back()"));
            // Actual game action and committed save; compare it after Activity recreation.
            js(scenario,"document.getElementById('continueGame').click();document.getElementById('startTrip').click();document.getElementById('modalClose').click();document.getElementById('modalClose').click();window.LastSignalApp.pause()");
            String save=js(scenario,"localStorage.getItem('last-signal-v1')");
            assertNotEquals("null",save);
            scenario.recreate();ready(scenario);
            assertEquals(save,js(scenario,"localStorage.getItem('last-signal-v1')"));
            assertEquals("true",js(scenario,"document.getElementById('continueGame').click();!document.getElementById('search').hidden"));
            assertEquals("false",js(scenario,"LastSignalAndroid.exportBackup('not JSON')"));
            // No service worker can make packaged code stale after an APK update.
            js(scenario,"navigator.serviceWorker.getRegistrations().then(r=>document.body.dataset.swCount=r.length)");
            long deadline=System.currentTimeMillis()+5000;
            while(System.currentTimeMillis()<deadline && !"\"0\"".equals(js(scenario,"document.body.dataset.swCount")))Thread.sleep(100);
            assertEquals("\"0\"",js(scenario,"document.body.dataset.swCount"));
        }
    }
}
