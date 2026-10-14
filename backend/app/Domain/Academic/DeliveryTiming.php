<?php
declare(strict_types=1);
namespace App\Domain\Academic;
final class DeliveryTiming {
 public static function isLate(?string $dueOn,string $recordedAt):bool {
  if($dueOn===null)return false;
  new DeclaredDateRange($dueOn);
  $schoolDate=(new \DateTimeImmutable($recordedAt,new \DateTimeZone('UTC')))->setTimezone(new \DateTimeZone('America/Lima'))->format('Y-m-d');
  return $schoolDate>$dueOn;
 }
}
