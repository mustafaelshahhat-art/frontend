export interface LocationCityData {
    name: string;
    neighborhoods: string[];
}

export interface LocationGovernorateData {
    name: string;
    cities: LocationCityData[];
}

export const LOCATIONS_DATA: LocationGovernorateData[] = [
    {
        name: 'القاهرة',
        cities: [
            { name: 'المعادي', neighborhoods: ['الحي التاسع', 'المعادي السرايات', 'زهراء المعادي'] },
            { name: 'القاهرة الجديدة', neighborhoods: ['التجمع الخامس', 'التجمع الثالث', 'الرحاب'] },
            { name: 'مصر الجديدة', neighborhoods: ['الكوربة', 'ميدان الحجاز', 'جسد السويس'] }
        ]
    },
    {
        name: 'الجيزة',
        cities: [
            { name: 'الدقي', neighborhoods: ['ميدان المساحة', 'شارع التحرير', 'البحوث'] },
            { name: 'الالمهندسين', neighborhoods: ['شارع أحمد عرابي', 'شارع جامعة الدول', 'ميدان سفنكس'] },
            { name: '6 أكتوبر', neighborhoods: ['الحي المتميز', 'الحي الأول', 'الحي الثامن'] }
        ]
    }
];
