[1mdiff --git a/src/server.js b/src/server.js[m
[1mindex d29516c..01370ac 100644[m
[1m--- a/src/server.js[m
[1m+++ b/src/server.js[m
[36m@@ -95,7 +95,16 @@[m [mreturn res.status(500).json({[m
   error: "INTERNAL_ERROR",[m
   message: "Something went wrong. Our team has been notified. Please try again later."[m
 });[m
[32m+[m[32m} finally {[m
[32m+[m[32m  if (req.file) {[m
[32m+[m[32m    await fs.unlink(req.file.path).catch((err) => {[m
[32m+[m[32m      console.error("Failed to delete uploaded file:", err);[m
[32m+[m[32m    });[m
[32m+[m[32m  }[m
 }[m
[32m+[m
[32m+[m
[32m+[m
 });[m
 [m
 [m
