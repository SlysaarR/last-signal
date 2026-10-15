package com.slysaarr.lastsignal;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.JavascriptInterface;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import androidx.webkit.WebViewAssetLoader;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;
import org.json.JSONObject;

public final class MainActivity extends Activity {
    static final String GAME_URL = "https://appassets.androidplatform.net/assets/game/index.html";
    private static final int EXPORT = 71, IMPORT = 72;
    private static final String CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; worker-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final ExecutorService files = Executors.newSingleThreadExecutor();
    private final AtomicBoolean exporting = new AtomicBoolean(false);
    private FrameLayout root;
    private WebView web;
    private WebViewAssetLoader loader;
    private ValueCallback<Uri[]> chooser;
    private boolean failed;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        exporting.set(state != null && state.getBoolean("exporting") && exportFile().isFile());
        root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(16,25,35));
        if (Build.VERSION.SDK_INT >= 30) getWindow().setDecorFitsSystemWindows(false);
        root.setOnApplyWindowInsetsListener((view, insets) -> {
            if (Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets safe = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout() | WindowInsets.Type.ime());
                view.setPadding(safe.left, safe.top, safe.right, safe.bottom);
            } else view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(), insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            return insets;
        });
        setContentView(root);
        root.requestApplyInsets();
        if (Build.VERSION.SDK_INT >= 33)
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::handleBack);
        createWebView();
    }

    static boolean isLocal(Uri uri) {
        return "https".equals(uri.getScheme()) && "appassets.androidplatform.net".equals(uri.getHost())
                && uri.getPort() == -1 && uri.getUserInfo() == null && uri.getPath() != null && uri.getPath().startsWith("/assets/game/");
    }
    static boolean isGameDocument(Uri uri) { return isLocal(uri) && "/assets/game/index.html".equals(uri.getPath()) && uri.getQuery() == null; }

    @SuppressLint("SetJavaScriptEnabled")
    private void createWebView() {
        failed = false;
        try { web = new WebView(this); }
        catch (RuntimeException unavailable) { showError(R.string.unsupported); return; }
        web.setBackgroundColor(Color.rgb(16,25,35));
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true); // Only a document explicitly chosen with the system picker.
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSafeBrowsingEnabled(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setTextZoom(100); // The game's accessible 100/115/130% setting controls reflow.
        settings.setMediaPlaybackRequiresUserGesture(true);
        loader = new WebViewAssetLoader.Builder().addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this)).build();
        web.addJavascriptInterface(new NativeBridge(), "LastSignalAndroid");
        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                if (!isLocal(request.getUrl()) || !"GET".equals(request.getMethod())) return blocked();
                WebResourceResponse response = loader.shouldInterceptRequest(request.getUrl());
                if (response == null) return blocked();
                Map<String,String> headers = new HashMap<>();
                headers.put("Content-Security-Policy", CSP);
                headers.put("X-Content-Type-Options", "nosniff");
                headers.put("Cache-Control", "no-store");
                response.setResponseHeaders(headers);
                return response;
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (request.isForMainFrame() && isGameDocument(uri)) return false;
                if (request.isForMainFrame() && request.hasGesture() && "https".equals(uri.getScheme()) && !isLocal(uri)) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); } catch (ActivityNotFoundException ignored) { }
                }
                return true;
            }
            @Override public void onPageFinished(WebView view, String url) {
                if (!isGameDocument(Uri.parse(url))) return;
                view.evaluateJavascript("typeof HTMLDialogElement !== 'undefined' && typeof ResizeObserver !== 'undefined' && CSS.supports('selector(:has(*))') && CSS.supports('height','100dvh')", supported -> {
                    if (!"true".equals(supported)) showError(R.string.unsupported);
                });
                handler.postDelayed(() -> {
                    if (web == view && !failed) view.evaluateJavascript("!!window.LastSignalApp", ready -> {
                        if (!"true".equals(ready)) showError(R.string.startup_error);
                    });
                }, 15000);
            }
            @Override public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                root.removeView(view); view.destroy(); web = null;
                showError(R.string.render_error); return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (chooser != null) chooser.onReceiveValue(null);
                chooser = callback;
                Intent pick = new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*");
                pick.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"application/json", "text/plain", "application/octet-stream"});
                try { startActivityForResult(pick, IMPORT); }
                catch (ActivityNotFoundException error) { chooser.onReceiveValue(null); chooser = null; }
                return true;
            }
        });
        root.addView(web, new FrameLayout.LayoutParams(-1,-1));
        web.loadUrl(GAME_URL);
    }

    private static WebResourceResponse blocked() {
        return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", new HashMap<>(), new ByteArrayInputStream(new byte[0]));
    }
    private void showError(int text) {
        if (failed || isFinishing() || isDestroyed()) return;
        failed = true;
        new AlertDialog.Builder(this).setMessage(text).setCancelable(false)
            .setPositiveButton(R.string.retry, (d,w) -> {
                if (web != null) { root.removeView(web); web.destroy(); web = null; }
                createWebView();
            }).setNegativeButton(R.string.close, (d,w) -> finish()).show();
    }
    private File exportFile() { return new File(getCacheDir(), "pending-backup.json"); }

    final class NativeBridge {
        @JavascriptInterface public String version() { return BuildConfig.VERSION_NAME; }
        @JavascriptInterface public boolean exportBackup(String text) {
            final byte[] bytes;
            try { bytes = BackupPayload.validate(text); }
            catch (IllegalArgumentException invalid) { return false; }
            if (!exporting.compareAndSet(false, true)) return false;
            files.execute(() -> {
                try (FileOutputStream out = new FileOutputStream(exportFile())) { out.write(bytes); out.getFD().sync(); }
                catch (IOException error) { handler.post(() -> completeExport("error")); return; }
                handler.post(() -> {
                    if (isFinishing() || isDestroyed()) { completeExport("cancelled"); return; }
                    String name = "last-signal-" + new SimpleDateFormat("yyyy-MM-dd-HHmmss", Locale.ROOT).format(new Date()) + ".json";
                    Intent create = new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("application/json").putExtra(Intent.EXTRA_TITLE, name);
                    try { startActivityForResult(create, EXPORT); }
                    catch (ActivityNotFoundException error) { completeExport("error"); }
                });
            });
            return true;
        }
    }

    private void completeExport(String status) {
        exporting.set(false);
        exportFile().delete();
        if (web != null && !isDestroyed()) web.evaluateJavascript("window.dispatchEvent(new CustomEvent('last-signal-backup-export',{detail:{status:" + JSONObject.quote(status) + "}}))", null);
    }
    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        Uri uri = result == RESULT_OK && data != null ? data.getData() : null;
        if (request == IMPORT) {
            if (chooser != null) { chooser.onReceiveValue(uri != null && "content".equals(uri.getScheme()) ? new Uri[]{uri} : null); chooser = null; }
        } else if (request == EXPORT && exporting.get()) {
            if (uri == null) { completeExport("cancelled"); return; }
            if (!"content".equals(uri.getScheme())) { completeExport("error"); return; }
            files.execute(() -> {
                String status = "saved";
                try {
                    byte[] bytes = Files.readAllBytes(exportFile().toPath());
                    BackupPayload.validate(new String(bytes, StandardCharsets.UTF_8));
                    try (OutputStream out = getContentResolver().openOutputStream(uri, "wt")) {
                        if (out == null) throw new IOException("No document stream");
                        out.write(bytes); out.flush();
                    }
                } catch (Exception error) { status = "error"; }
                String finalStatus = status;
                handler.post(() -> completeExport(finalStatus));
            });
        }
    }
    private void handleBack() {
        if (web == null || failed) { moveTaskToBack(true); return; }
        web.evaluateJavascript("window.LastSignalApp ? window.LastSignalApp.back() : 'exit'", result -> {
            if ("\"exit\"".equals(result)) moveTaskToBack(true);
        });
    }
    // Legacy Android 8–12 fallback. API 33+ uses the framework
    // OnBackInvokedDispatcher registered in onCreate, including Android 16 gestures.
    @SuppressLint("GestureBackNavigation")
    @Override public void onBackPressed() { handleBack(); }
    @Override protected void onPause() {
        if (web != null) { web.evaluateJavascript("window.LastSignalApp?.pause()", null); web.onPause(); }
        super.onPause();
    }
    @Override protected void onResume() {
        super.onResume();
        if (web != null) { web.onResume(); web.evaluateJavascript("window.LastSignalApp?.resume()", null); }
    }
    @Override protected void onSaveInstanceState(Bundle state) {
        state.putBoolean("exporting", exporting.get()); super.onSaveInstanceState(state);
    }
    @Override protected void onDestroy() {
        if (chooser != null) { chooser.onReceiveValue(null); chooser = null; }
        if (web != null) { root.removeView(web); web.destroy(); web = null; }
        handler.removeCallbacksAndMessages(null);
        files.shutdown();
        super.onDestroy();
    }
    WebView gameView() { return web; }
}
