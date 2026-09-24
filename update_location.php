<?php

header("Content-Type: text/plain; charset=utf-8");

$servername = "localhost";
$username = "root";
$password = "";
$dbname = "shuttle_tracking";

$conn = new mysqli(
    $servername,
    $username,
    $password,
    $dbname
);

if ($conn->connect_error) {
    die(
        "Database connection failed: "
        . $conn->connect_error
    );
}

$conn->set_charset("utf8mb4");


// ======================================================
// รับข้อมูลจาก ESP32
// ======================================================

$bus_id =
    $_GET['bus_id'] ?? '';

$bus_name =
    $_GET['bus_name'] ?? '';

$latitude =
    $_GET['latitude'] ?? '';

$longitude =
    $_GET['longitude'] ?? '';

$speed =
    $_GET['speed'] ?? 0;

$satellites =
    $_GET['satellites'] ?? 0;


// ======================================================
// ตรวจสอบข้อมูล
// ======================================================

if (
    $bus_id == '' ||
    $bus_name == '' ||
    $latitude == '' ||
    $longitude == ''
) {
    die("Missing data");
}


// ======================================================
// บันทึกตำแหน่งล่าสุด
//
// ถ้ายังไม่มี BUS01 -> INSERT
// ถ้ามี BUS01 แล้ว -> UPDATE แถวเดิม
// ======================================================

$sql = "
INSERT INTO current_bus_location
(
    bus_id,
    bus_name,
    latitude,
    longitude,
    speed,
    satellites
)
VALUES (?, ?, ?, ?, ?, ?)

ON DUPLICATE KEY UPDATE

    bus_name = VALUES(bus_name),

    latitude = VALUES(latitude),

    longitude = VALUES(longitude),

    speed = VALUES(speed),

    satellites = VALUES(satellites),

    updated_at = CURRENT_TIMESTAMP
";


// ======================================================
// Prepare
// ======================================================

$stmt =
    $conn->prepare($sql);

if (!$stmt) {

    die(
        "Prepare failed: "
        . $conn->error
    );
}


// ======================================================
// Bind
// ======================================================

$stmt->bind_param(
    "ssdddi",
    $bus_id,
    $bus_name,
    $latitude,
    $longitude,
    $speed,
    $satellites
);


// ======================================================
// Execute
// ======================================================

if ($stmt->execute()) {

    echo "OK";

} else {

    echo "ERROR: "
        . $stmt->error;
}


// ======================================================
// Close
// ======================================================

$stmt->close();

$conn->close();

?>