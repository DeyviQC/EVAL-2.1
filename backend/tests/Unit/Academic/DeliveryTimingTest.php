<?php
declare(strict_types=1);
namespace Tests\Unit\Academic;
use App\Domain\Academic\DeliveryTiming;
use PHPUnit\Framework\TestCase;
final class DeliveryTimingTest extends TestCase {
 public function testUtcMidnightDoesNotPrematurelyMarkAPeruvianDeliveryLate():void {
  $this->assertFalse(DeliveryTiming::isLate('2026-10-14','2026-10-15 04:59:59.999999'));
  $this->assertTrue(DeliveryTiming::isLate('2026-10-14','2026-10-15 05:00:00.000000'));
 }
 public function testNoDeadlineDoesNotInventALateSubmission():void {
  $this->assertFalse(DeliveryTiming::isLate(null,'2027-01-01 12:00:00'));
 }
 public function testTheCompleteDueDateRemainsAvailable():void {
  $this->assertFalse(DeliveryTiming::isLate('2026-10-14','2026-10-14 12:00:00'));
 }
}
