def get_module_schema():
    """
    Schema định nghĩa các ô input trên Frontend.
    Đã cập nhật theo chuẩn Ftel Camera (Face EXT, Search, RTSP Loop...).
    """
    return {
        # --- 1. RTSP READER (Mới thêm) ---
        "rtsp_reader": {
            "label": "Stream Settings (RTSP Reader)",
            "fields": [
                {
                    "key": "LOOP_FILE", 
                    "label": "Loop video (if the input is a file)", 
                    "type": "boolean", 
                    "default": False
                },
                {
                    "key": "ROTATION_DEGREE", 
                    "label": "Rotate image (0, 90, 180, 270)", 
                    "type": "select", 
                    "options": ["0", "90", "180", "270"],
                    "default": "0"
                }
            ]
        },

        # --- 2. VIEWER SERVICE ---
        "viewer_service": {
            "label": "Display Settings (Viewer)",
            "fields": [
                {
                    "key": "PLOT",
                    "label": "Drawing Mode",
                    "type": "select",
                    "options": ["all", "face", "tracking", "none"],
                    "default": "all"
                },
                {
                    "key": "ALERT",
                    "label": "Enable Alerts",
                    "type": "boolean",
                    "default": True
                },
                {
                    "key": "INV_SCALE",
                    "label": "Inverse Scale",
                    "type": "boolean",
                    "default": False
                },
                {
                    "key": "OUTPUT_FPS",
                    "label": "Output FPS",
                    "type": "number",
                    "default": 25
                },
                {
                    "key": "WEBSOCKET_QUALITY",
                    "label": "Image Quality (1-100)",
                    "type": "number",
                    "default": 100
                },
                {
                    "key": "VERBOSE",
                    "label": "Detailed Log",
                    "type": "boolean",
                    "default": True
                }
            ]
        },

        # --- 3. DETECTION ---
        "pythera_detection": {
            "label": "Human Recognition (Detection)",
            "fields": [
                {"key": "THRESHOLD", "label": "Accuracy (Threshold)", "type": "number", "default": 0.4},
                {"key": "BATCH_SIZE", "label": "Batch Size", "type": "number", "default": 4},
                {"key": "MODEL_NAME", "label": "Model Name", "type": "text", "default": "detection_ensemble"},
                {"key": "VERBOSE", "label": "Detailed Log", "type": "boolean", "default": True}
            ]
        },

        # --- 4. TRACKING ---
        "tracking_service": {
            "label": "Tracking",
            "fields": [
                {"key": "THRESHOLD", "label": "Tracking Threshold", "type": "number", "default": 0.92},
                {"key": "FRAME_RATE", "label": "Frame Rate", "type": "number", "default": 27},
                {"key": "USE_REID", "label": "Use ReID", "type": "boolean", "default": False},
                {"key": "BATCH_SIZE", "label": "Batch Size", "type": "number", "default": 4},
                {"key": "VERBOSE", "label": "Detailed Log", "type": "boolean", "default": True}
            ]
        },

        # --- 5. POSE ---
        "pose_detection": {
            "label": "Pose Detection",
            "fields": [
                {"key": "THRESHOLD", "label": "Pose Threshold", "type": "number", "default": 0.2},
                {"key": "FRAME_RATE", "label": "Frame Rate", "type": "number", "default": 27},
                {"key": "BATCH_SIZE", "label": "Batch Size", "type": "number", "default": 6},
                {"key": "VERBOSE", "label": "Detailed Log", "type": "boolean", "default": True}
            ]
        },

        # --- 6. ACTION ---
        "action_recognition": {
            "label": "Action Recognition",
            "fields": [
                {"key": "THRESHOLD", "label": "Action Threshold", "type": "number", "default": 0.25},
                {"key": "FRAME_RATE", "label": "Frame Rate", "type": "number", "default": 27},
                {"key": "MAX_FRAMES", "label": "Number of Frames to Analyze", "type": "number", "default": 30},
                {"key": "CLASSES", "label": "Action List (JSON)", "type": "textarea", "default": '{"-1":"","0":"Standing","1":"Walking","2":"Sitting","3":"Lying Down","4":"Stand up","5":"Sit down","6":"Fall Down"}'},
                {"key": "VERBOSE", "label": "Detailed Log", "type": "boolean", "default": True}
            ]
        },

        # --- 7. FACE SERVICE (Cập nhật lớn) ---
        "face_service": {
            "label": "Face Recognition",
            "fields": [
                # Detection params
                {"key": "DET_THRESHOLD", "label": "Detetection Threshold", "type": "number", "default": 0.4},
                {"key": "DET_BATCH_SIZE", "label": "Batch Size (Det)", "type": "number", "default": 8},
                
                # Recognition params (Đổi từ REG sang EXT theo template mới)
                {"key": "EXT_MODEL_NAME", "label": "Extraction Model", "type": "text", "default": "face_ensemble"},
                {"key": "EXT_BATCH_SIZE", "label": "Batch Size (Ext)", "type": "number", "default": 8},

                # Search params
                {"key": "SEARCH_URL", "label": "Search Server URL", "type": "text", "default": "http://192.168.1.130:8686/v1"},
                {"key": "SEARCH_THRESHOLD", "label": "Search Threshold", "type": "number", "default": 0.5},
                {"key": "COLLECTION_NAME", "label": "Collection", "type": "text", "default": "FPT"},
                {"key": "VERBOSE", "label": "Detailed Log", "type": "boolean", "default": True}
            ]
        },

        # --- 8. FIRE SERVICE ---
        "fire_service": {
            "label": "Fire Alert",
            "fields": [
                {"key": "DET_CLASSES", "label": "Detection Class", "type": "text", "default": '{"0":"Fire"}'},
                {"key": "CLS_CLASSES", "label": "Classification Class", "type": "text", "default": '{"0":"Fire","1":"Normal","2":"Smoke"}'},
                {"key": "VERBOSE", "label": "Detailed Log", "type": "boolean", "default": True}
            ]
        },
        
         # --- 9. COUNTING SERVICE ---
        "counting_service": {
            "label": "Counting",
            "fields": [
                {"key": "INCLUDE_CLASSES", "label": "Counting Object", "type": "text", "default": '["body"]'},
                {"key": "VERBOSE", "label": "Detailed Log", "type": "boolean", "default": True}
            ]
        }
    }