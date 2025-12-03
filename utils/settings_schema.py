def get_module_schema():
    """
    Schema định nghĩa các ô input trên Frontend.
    Đã cập nhật theo chuẩn Ftel Camera (Face EXT, Search, RTSP Loop...).
    """
    return {
        # --- 1. RTSP READER (Mới thêm) ---
        "rtsp_reader": {
            "label": "Cấu hình Luồng (RTSP Reader)",
            "fields": [
                {
                    "key": "LOOP_FILE", 
                    "label": "Lặp lại video (Nếu input là file)", 
                    "type": "boolean", 
                    "default": False
                },
                {
                    "key": "ROTATION_DEGREE", 
                    "label": "Xoay hình (0, 90, 180, 270)", 
                    "type": "select", 
                    "options": ["0", "90", "180", "270"],
                    "default": "0"
                }
            ]
        },

        # --- 2. VIEWER SERVICE ---
        "viewer_service": {
            "label": "Cấu hình Hiển thị (Viewer)",
            "fields": [
                {
                    "key": "PLOT",
                    "label": "Chế độ vẽ (Plot)",
                    "type": "select",
                    "options": ["all", "face", "tracking", "none"],
                    "default": "all"
                },
                {
                    "key": "ALERT",
                    "label": "Bật cảnh báo (Alert)",
                    "type": "boolean",
                    "default": True
                },
                {
                    "key": "INV_SCALE",
                    "label": "Inverse Scale (Nếu hình bị lệch)",
                    "type": "boolean",
                    "default": False
                },
                {
                    "key": "OUTPUT_FPS",
                    "label": "FPS đầu ra",
                    "type": "number",
                    "default": 25
                },
                {
                    "key": "WEBSOCKET_QUALITY",
                    "label": "Chất lượng ảnh (1-100)",
                    "type": "number",
                    "default": 100
                },
                {
                    "key": "VERBOSE",
                    "label": "Log chi tiết",
                    "type": "boolean",
                    "default": False
                }
            ]
        },

        # --- 3. DETECTION ---
        "pythera_detection": {
            "label": "Nhận diện người (Detection)",
            "fields": [
                {"key": "THRESHOLD", "label": "Độ chính xác (Threshold)", "type": "number", "default": 0.4},
                {"key": "BATCH_SIZE", "label": "Batch Size", "type": "number", "default": 4},
                {"key": "MODEL_NAME", "label": "Tên Model", "type": "text", "default": "detection_ensemble"},
                {"key": "VERBOSE", "label": "Log chi tiết", "type": "boolean", "default": False}
            ]
        },

        # --- 4. TRACKING ---
        "tracking_service": {
            "label": "Theo vết (Tracking)",
            "fields": [
                {"key": "THRESHOLD", "label": "Ngưỡng Track", "type": "number", "default": 0.92},
                {"key": "USE_REID", "label": "Sử dụng ReID", "type": "boolean", "default": False},
                {"key": "BATCH_SIZE", "label": "Batch Size", "type": "number", "default": 4},
                {"key": "VERBOSE", "label": "Log chi tiết", "type": "boolean", "default": False}
            ]
        },

        # --- 5. POSE ---
        "pose_detection": {
            "label": "Nhận diện dáng (Pose)",
            "fields": [
                {"key": "THRESHOLD", "label": "Ngưỡng Pose", "type": "number", "default": 0.2},
                {"key": "BATCH_SIZE", "label": "Batch Size", "type": "number", "default": 6},
                {"key": "VERBOSE", "label": "Log chi tiết", "type": "boolean", "default": False}
            ]
        },

        # --- 6. ACTION ---
        "action_recognition": {
            "label": "Nhận diện hành động",
            "fields": [
                {"key": "THRESHOLD", "label": "Ngưỡng hành động", "type": "number", "default": 0.25},
                {"key": "MAX_FRAMES", "label": "Số frame phân tích", "type": "number", "default": 30},
                {"key": "CLASSES", "label": "Danh sách hành động (JSON)", "type": "textarea", "default": '{"-1":"","0":"Standing","1":"Walking","2":"Sitting","3":"Lying Down","4":"Stand up","5":"Sit down","6":"Fall Down"}'},
                {"key": "VERBOSE", "label": "Log chi tiết", "type": "boolean", "default": False}
            ]
        },

        # --- 7. FACE SERVICE (Cập nhật lớn) ---
        "face_service": {
            "label": "Nhận diện khuôn mặt",
            "fields": [
                # Detection params
                {"key": "DET_THRESHOLD", "label": "Ngưỡng tìm mặt (Det)", "type": "number", "default": 0.4},
                {"key": "DET_BATCH_SIZE", "label": "Batch Size (Det)", "type": "number", "default": 8},
                
                # Recognition params (Đổi từ REG sang EXT theo template mới)
                {"key": "EXT_MODEL_NAME", "label": "Model Trích xuất", "type": "text", "default": "face_ensemble"},
                {"key": "EXT_BATCH_SIZE", "label": "Batch Size (Ext)", "type": "number", "default": 8},

                # Search params
                {"key": "SEARCH_URL", "label": "Search Server URL", "type": "text", "default": "http://192.168.2.130:8686/v1"},
                {"key": "SEARCH_THRESHOLD", "label": "Ngưỡng Search", "type": "number", "default": 0.5},
                {"key": "COLLECTION_NAME", "label": "Collection (Vector DB)", "type": "text", "default": "FPT"},
                
                {"key": "VERBOSE", "label": "Log chi tiết", "type": "boolean", "default": False}
            ]
        },

        # --- 8. FIRE SERVICE ---
        "fire_service": {
            "label": "Báo cháy (Fire)",
            "fields": [
                {"key": "DET_CLASSES", "label": "Class tìm kiếm", "type": "text", "default": '{"0":"Fire"}'},
                {"key": "CLS_CLASSES", "label": "Class phân loại", "type": "text", "default": '{"0":"Fire","1":"Normal","2":"Smoke"}'},
                {"key": "VERBOSE", "label": "Log chi tiết", "type": "boolean", "default": False}
            ]
        },
        
         # --- 9. COUNTING SERVICE ---
        "counting_service": {
            "label": "Đếm người (Counting)",
            "fields": [
                {"key": "INCLUDE_CLASSES", "label": "Đối tượng đếm", "type": "text", "default": '["body"]'},
                {"key": "VERBOSE", "label": "Log chi tiết", "type": "boolean", "default": False}
            ]
        }
    }