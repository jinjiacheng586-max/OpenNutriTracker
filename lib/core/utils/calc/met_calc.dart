import 'package:opennutritracker/core/domain/entity/physical_activity_entity.dart';
import 'package:opennutritracker/core/domain/entity/user_entity.dart';

class METCalc {
  /// Calculates total kcal with formula by the
  /// '2024 Compendium of Physical Activities'
  /// https://doi.org/10.1249/MSS.0000000000003624
  /// by Strath et al. / Ainsworth et al.
  /// kcal = MET x weight in kg x duration in hours
  static double getTotalBurnedKcal(
    UserEntity userEntity,
    PhysicalActivityEntity physicalActivityEntity,
    double durationMin,
  ) {
    return physicalActivityEntity.mets * userEntity.weightKG * durationMin / 60;
  }
}
