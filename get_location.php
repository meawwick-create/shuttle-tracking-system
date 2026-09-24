<?php

header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: *");

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

    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "Database connection failed"
    ]);

    exit;
}

$conn->set_charset("utf8mb4");


// ======================================================
// อ่านตำแหน่งล่าสุดของรถ
// ======================================================

$bus_id = $_GET['bus_id'] ?? 'BUS01';


$sql = "
SELECT
    bus_id,
    bus_name,
    latitude,
    longitude,
    speed,
    satellites,
    updated_at
FROM current_bus_location
WHERE bus_id = ?
LIMIT 1
";


$stmt = $conn->prepare($sql);

$stmt->bind_param(
    "s",
    $bus_id
);

$stmt->execute();

$result = $stmt->get_result();


// ======================================================
// ส่งข้อมูลกลับเป็น JSON
// ======================================================

if ($result->num_rows > 0) {

    $row = $result->fetch_assoc();

    // แปลงตัวเลขให้เป็น Number
    $row["latitude"] = (float)$row["latitude"];
    $row["longitude"] = (float)$row["longitude"];
    $row["speed"] = (float)$row["speed"];
    $row["satellites"] = (int)$row["satellites"];

    echo json_encode(
        $row,
        JSON_UNESCAPED_UNICODE
    );

} else {

    http_response_code(404);

    echo json_encode([
        "success" => false,
        "message" => "Bus not found"
    ]);
}


$stmt->close();
$conn->close();

?>